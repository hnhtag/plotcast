const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function next(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);
  const { eventId } = body;
  const now = new Date().toISOString();

  const metaResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));
  const autoShowAnswers = metaResult.Item?.autoShowAnswers !== false;

  let result;
  try {
    result = await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET currentStoryIndex = currentStoryIndex + :one, autoShowAnswers = if_not_exists(autoShowAnswers, :autoDefault), answerTimerSec = if_not_exists(answerTimerSec, :timerDefault), answersOpen = :answersOpen, answersOpenedAt = :answersOpenedAt',
      ConditionExpression: 'attribute_exists(PK) AND #s = :active',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':active': 'active',
        ':one': 1,
        ':autoDefault': true,
        ':timerDefault': 0,
        ':answersOpen': autoShowAnswers,
        ':answersOpenedAt': autoShowAnswers ? now : null,
      },
      ReturnValues: 'ALL_NEW',
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 400, message: 'Event not found or not active' };
    }
    throw err;
  }

  return c.json({ ok: true, currentStoryIndex: result.Attributes.currentStoryIndex });
};
