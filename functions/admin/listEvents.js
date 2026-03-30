const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;
const DEFAULT_LIMIT = 20;

module.exports = async function listEvents(c) {
  const limitParam = parseInt(c.req.query('limit') || DEFAULT_LIMIT, 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const cursorParam = c.req.query('cursor');

  let exclusiveStartKey;
  if (cursorParam) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(cursorParam, 'base64').toString('utf8'));
    } catch {
      throw { statusCode: 400, message: 'Invalid cursor' };
    }
  }

  const result = await db.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'EventsByCreatedAtIndex',
    KeyConditionExpression: 'entityType = :type',
    ExpressionAttributeValues: { ':type': 'EVENT' },
    ScanIndexForward: false, // newest first
    Limit: limit,
    ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
  }));

  const events = (result.Items || []).map(item => ({
    eventId: item.eventId,
    title: item.title || '',
    status: item.status || null,
    createdAt: item.createdAt,
  }));

  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : null;

  return c.json({ events, nextCursor });
};
