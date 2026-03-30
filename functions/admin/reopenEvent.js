const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function reopenEvent(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET #s = :waiting, currentStoryIndex = :initial REMOVE finishedAt',
      ConditionExpression: 'attribute_exists(PK) AND #s = :finished',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':waiting': 'waiting',
        ':finished': 'finished',
        ':initial': -1,
      },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 400, message: 'Event not found or not finished' };
    }
    throw err;
  }

  return c.json({ ok: true, status: 'waiting', currentStoryIndex: -1 });
};