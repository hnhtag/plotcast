const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function start(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;
  const now = new Date().toISOString();

  const metaResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));

  const autoShowAnswers = metaResult.Item?.autoShowAnswers !== false;

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET #s = :active, currentStoryIndex = :zero, startedAt = :now, autoShowAnswers = if_not_exists(autoShowAnswers, :autoDefault), answerTimerSec = if_not_exists(answerTimerSec, :timerDefault), answersOpen = :answersOpen, answersOpenedAt = :answersOpenedAt',
      ConditionExpression: 'attribute_exists(PK) AND #s = :waiting AND totalStories > :zero',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':active': 'active',
        ':waiting': 'waiting',
        ':autoDefault': true,
        ':timerDefault': 0,
        ':answersOpen': autoShowAnswers,
        ':answersOpenedAt': autoShowAnswers ? now : null,
        ':zero': 0,
        ':now': now,
      },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 400, message: 'Event not found, already started, or has no stories' };
    }
    throw err;
  }

  return c.json({ ok: true, status: 'active', currentStoryIndex: 0 });
};
