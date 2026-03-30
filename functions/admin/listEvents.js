const { QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;
const DEFAULT_LIMIT = 20;
const EVENTS_INDEX = 'EventsByCreatedAtIndex';

function encodeCursor(mode, value) {
  return Buffer.from(JSON.stringify({ mode, value })).toString('base64');
}

function decodeCursor(cursorParam) {
  try {
    return JSON.parse(Buffer.from(cursorParam, 'base64').toString('utf8'));
  } catch {
    throw { statusCode: 400, message: 'Invalid cursor' };
  }
}

function mapEvents(items) {
  return (items || []).map((item) => ({
    eventId: item.eventId,
    title: item.title || '',
    status: item.status || null,
    createdAt: item.createdAt,
  }));
}

function isIndexQueryFailure(err) {
  return err?.name === 'ValidationException' || err?.name === 'ResourceNotFoundException';
}

async function listEventsViaIndex(limit, exclusiveStartKey) {
  const result = await db.send(new QueryCommand({
    TableName: TABLE,
    IndexName: EVENTS_INDEX,
    KeyConditionExpression: 'entityType = :type',
    ExpressionAttributeValues: { ':type': 'EVENT' },
    ScanIndexForward: false,
    Limit: limit,
    ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
  }));

  return {
    events: mapEvents(result.Items),
    nextCursor: result.LastEvaluatedKey ? encodeCursor('index', result.LastEvaluatedKey) : null,
  };
}

async function listEventsViaScan(limit, offset) {
  let scanStartKey = null;
  const collectedItems = [];

  while (true) {
    const result = await db.send(new ScanCommand({
      TableName: TABLE,
      ProjectionExpression: 'PK, SK, eventId, title, #status, createdAt',
      FilterExpression: 'SK = :meta',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':meta': 'META',
      },
      Limit: 100,
      ...(scanStartKey && { ExclusiveStartKey: scanStartKey }),
    }));

    const metaItems = (result.Items || []).filter((item) => typeof item?.PK === 'string' && item.PK.startsWith('EVENT#'));
    collectedItems.push(...metaItems);
    if (!result.LastEvaluatedKey) {
      break;
    }

    scanStartKey = result.LastEvaluatedKey;
  }

  collectedItems.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const pagedItems = collectedItems.slice(safeOffset, safeOffset + limit);
  const nextOffset = safeOffset + pagedItems.length;

  return {
    events: mapEvents(pagedItems),
    nextCursor: nextOffset < collectedItems.length ? encodeCursor('scan', nextOffset) : null,
  };
}

module.exports = async function listEvents(c) {
  const limitParam = parseInt(c.req.query('limit') || DEFAULT_LIMIT, 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const cursorParam = c.req.query('cursor');

  let decodedCursor = null;
  if (cursorParam) {
    decodedCursor = decodeCursor(cursorParam);
  }

  try {
    const exclusiveStartKey = decodedCursor?.mode === 'index'
      ? decodedCursor.value
      : decodedCursor && decodedCursor.mode == null
        ? decodedCursor
        : null;
    const result = await listEventsViaIndex(limit, exclusiveStartKey);
    return c.json(result);
  } catch (err) {
    if (!isIndexQueryFailure(err)) {
      throw err;
    }

    const offset = decodedCursor?.mode === 'scan' ? decodedCursor.value : 0;
    const result = await listEventsViaScan(limit, offset);
    return c.json(result);
  }
};
