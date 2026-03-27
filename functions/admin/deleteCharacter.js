const { GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function deleteCharacter(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'characterId']);
  const { eventId, characterId } = body;

  const existing = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `CHARACTER#${characterId}` },
  }));
  if (!existing.Item) throw { statusCode: 404, message: 'Character not found' };

  await db.send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `CHARACTER#${characterId}` },
  }));

  return c.json({ ok: true });
};
