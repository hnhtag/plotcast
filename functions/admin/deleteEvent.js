const { QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');
const { verifyAdminPassword } = require('../shared/adminPassword');

const TABLE = process.env.TABLE_NAME;
const BATCH_SIZE = 25;

async function queryAllEventItems(eventId) {
  const items = [];
  let exclusiveStartKey;

  do {
    const result = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `EVENT#${eventId}` },
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    }));

    items.push(...(result.Items || []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

async function deleteBatch(keys) {
  if (keys.length === 0) return;

  const requestItems = {
    [TABLE]: keys.map(Key => ({ DeleteRequest: { Key } })),
  };

  let unprocessed = requestItems;
  while (unprocessed && Object.keys(unprocessed).length > 0) {
    const result = await db.send(new BatchWriteCommand({ RequestItems: unprocessed }));
    unprocessed = result.UnprocessedItems;
  }
}

module.exports = async function deleteEvent(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'password']);
  const { eventId, password } = body;

  await verifyAdminPassword(password);

  const items = await queryAllEventItems(eventId);
  if (!items.find(item => item.SK === 'META')) {
    throw { statusCode: 404, message: 'Event not found' };
  }

  const keys = items.map(item => ({ PK: item.PK, SK: item.SK }));
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const chunk = keys.slice(i, i + BATCH_SIZE);
    await deleteBatch(chunk);
  }

  return c.json({ ok: true, deletedItems: keys.length });
};