const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');
const { normalizeTimerSeconds } = require('../shared/answerWindow');

const TABLE = process.env.TABLE_NAME;

module.exports = async function updateLiveSettings(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);

  const { eventId } = body;
  const autoShowAnswers = body.autoShowAnswers !== false;
  const answerTimerSec = normalizeTimerSeconds(body.answerTimerSec);

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET autoShowAnswers = :autoShowAnswers, answerTimerSec = :answerTimerSec',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: {
        ':autoShowAnswers': autoShowAnswers,
        ':answerTimerSec': answerTimerSec,
      },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 404, message: 'Event not found' };
    }
    throw err;
  }

  return c.json({ ok: true, autoShowAnswers, answerTimerSec });
};
