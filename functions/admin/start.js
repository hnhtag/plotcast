const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function start(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;

  const result = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));
  if (!result.Item) throw { statusCode: 404, message: 'Event not found' };
  if (result.Item.status !== 'waiting') throw { statusCode: 400, message: `Event is already ${result.Item.status}` };
  if (result.Item.totalStories === 0) throw { statusCode: 400, message: 'Cannot start event with no stories' };

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
    UpdateExpression: 'SET #s = :active, currentStoryIndex = :zero, startedAt = :now',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':active': 'active', ':zero': 0, ':now': new Date().toISOString() },
  }));

  return c.json({ ok: true, status: 'active', currentStoryIndex: 0 });
};
