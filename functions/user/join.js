const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function join(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'nickname', 'userId']);
  const { eventId, nickname, userId } = body;

  if (nickname.length < 1 || nickname.length > 30) {
    throw { statusCode: 400, message: 'Nickname must be 1–30 characters' };
  }
  if (userId.length < 8) throw { statusCode: 400, message: 'Invalid userId' };

  const metaResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));
  if (!metaResult.Item) throw { statusCode: 404, message: 'Event not found' };
  if (metaResult.Item.status === 'finished') throw { statusCode: 400, message: 'Event has already finished' };

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `USER#${userId}` },
    UpdateExpression: 'SET nickname = if_not_exists(nickname, :n), totalScore = if_not_exists(totalScore, :zero), joinedAt = if_not_exists(joinedAt, :now), userId = if_not_exists(userId, :uid)',
    ExpressionAttributeValues: { ':n': nickname, ':zero': 0, ':now': new Date().toISOString(), ':uid': userId },
  }));

  return c.json({
    ok: true,
    status: metaResult.Item.status,
    currentStoryIndex: metaResult.Item.currentStoryIndex,
    title: metaResult.Item.title,
  });
};
