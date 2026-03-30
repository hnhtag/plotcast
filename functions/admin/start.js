const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function start(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET #s = :active, currentStoryIndex = :zero, startedAt = :now',
      ConditionExpression: 'attribute_exists(PK) AND #s = :waiting AND totalStories > :zero',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':active': 'active',
        ':waiting': 'waiting',
        ':zero': 0,
        ':now': new Date().toISOString(),
      },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 400, message: 'Event not found, already started, or has no stories' };
    }
    throw err;
  }

  return c.json({ ok: true, status: 'active', currentStoryIndex: 0 });
};
