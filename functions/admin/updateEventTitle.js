const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function updateEventTitle(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'title']);
  const { eventId, title } = body;

  const cleanTitle = String(title).trim();
  if (cleanTitle.length < 1 || cleanTitle.length > 120) {
    throw { statusCode: 400, message: 'Title must be 1-120 characters' };
  }

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET title = :title',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':title': cleanTitle },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 404, message: 'Event not found' };
    }
    throw err;
  }

  return c.json({ ok: true, title: cleanTitle });
};