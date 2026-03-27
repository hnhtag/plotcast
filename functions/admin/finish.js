const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function finish(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;

  const result = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));
  if (!result.Item) throw { statusCode: 404, message: 'Event not found' };
  if (result.Item.status === 'finished') throw { statusCode: 400, message: 'Event is already finished' };

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
    UpdateExpression: 'SET #s = :finished, finishedAt = :now',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':finished': 'finished', ':now': new Date().toISOString() },
  }));

  return c.json({ ok: true, status: 'finished' });
};
