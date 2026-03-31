const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function updateCharacter(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'characterId']);
  const { eventId, characterId, name, description, encouragement, imageEmoji, minScore, maxScore } = body;

  const existing = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `CHARACTER#${characterId}` },
  }));
  if (!existing.Item) throw { statusCode: 404, message: 'Character not found' };

  const updates = [];
  const values = {};
  const names = {};

  if (name !== undefined) { updates.push('#n = :n'); names['#n'] = 'name'; values[':n'] = name; }
  if (description !== undefined) { updates.push('description = :d'); values[':d'] = description; }
  if (encouragement !== undefined) { updates.push('encouragement = :c'); values[':c'] = encouragement; }
  if (imageEmoji !== undefined) { updates.push('imageEmoji = :e'); values[':e'] = imageEmoji; }
  if (minScore !== undefined) { updates.push('minScore = :min'); values[':min'] = minScore; }
  if (maxScore !== undefined) { updates.push('maxScore = :max'); values[':max'] = maxScore; }

  if (updates.length === 0) throw { statusCode: 400, message: 'No fields to update' };

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `CHARACTER#${characterId}` },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeValues: values,
    ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
  }));

  return c.json({ ok: true });
};
