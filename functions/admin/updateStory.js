const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function updateStory(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'storyIndex']);
  const { eventId, storyIndex, title, story, keyTakeaway, optionGroups } = body;

  const paddedIndex = String(storyIndex).padStart(3, '0');
  const existing = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `STORY#${paddedIndex}` },
  }));
  if (!existing.Item) throw { statusCode: 404, message: 'Story not found' };

  const updates = [];
  const values = {};
  const names = {};

  if (title !== undefined) { updates.push('#t = :t'); names['#t'] = 'title'; values[':t'] = title; }
  if (story !== undefined) { updates.push('#s = :s'); names['#s'] = 'story'; values[':s'] = story; }
  if (keyTakeaway !== undefined) { updates.push('keyTakeaway = :kt'); values[':kt'] = keyTakeaway; }
  if (optionGroups !== undefined) { updates.push('optionGroups = :og'); values[':og'] = optionGroups; }

  if (updates.length === 0) throw { statusCode: 400, message: 'No fields to update' };

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `STORY#${paddedIndex}` },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeValues: values,
    ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
  }));

  return c.json({ ok: true });
};
