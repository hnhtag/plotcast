const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function openAnswers(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;

  const now = new Date().toISOString();

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET answersOpen = :open, answersOpenedAt = :now',
      ConditionExpression: 'attribute_exists(PK) AND #s = :active',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':open': true,
        ':now': now,
        ':active': 'active',
      },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 400, message: 'Event not found or not active' };
    }
    throw err;
  }

  return c.json({ ok: true, answersOpen: true, answersOpenedAt: now });
};
