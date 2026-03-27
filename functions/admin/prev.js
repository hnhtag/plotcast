const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function prev(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;

  const result = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));
  if (!result.Item) throw { statusCode: 404, message: 'Event not found' };
  if (result.Item.status !== 'active') throw { statusCode: 400, message: 'Event is not active' };

  const { currentStoryIndex } = result.Item;
  if (currentStoryIndex <= 0) throw { statusCode: 400, message: 'Already at first story' };

  const newIndex = currentStoryIndex - 1;
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
    UpdateExpression: 'SET currentStoryIndex = :idx',
    ExpressionAttributeValues: { ':idx': newIndex },
  }));

  return c.json({ ok: true, currentStoryIndex: newIndex });
};
