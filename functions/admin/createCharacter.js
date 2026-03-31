const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { nanoid } = require('nanoid');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function createCharacter(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'name', 'description', 'minScore', 'maxScore']);
  const { eventId, name, description, encouragement, imageEmoji, minScore, maxScore } = body;

  if (typeof minScore !== 'number' || typeof maxScore !== 'number') {
    throw { statusCode: 400, message: 'minScore and maxScore must be numbers' };
  }
  if (minScore > maxScore) throw { statusCode: 400, message: 'minScore must be <= maxScore' };

  const characterId = nanoid(8);
  await db.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `EVENT#${eventId}`, SK: `CHARACTER#${characterId}`,
      characterId,
      name,
      description,
      encouragement: encouragement || '',
      imageEmoji: imageEmoji || '🎭',
      minScore,
      maxScore,
      createdAt: new Date().toISOString(),
    },
  }));

  return c.json({ characterId });
};
