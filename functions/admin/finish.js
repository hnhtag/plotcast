const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function finish(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET #s = :finished, finishedAt = :now',
      ConditionExpression: 'attribute_exists(PK) AND #s <> :finished',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':finished': 'finished',
        ':now': new Date().toISOString(),
      },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 400, message: 'Event not found or already finished' };
    }
    throw err;
  }

  return c.json({ ok: true, status: 'finished' });
};
