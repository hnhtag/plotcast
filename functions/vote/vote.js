const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');
const { deriveAnswerWindow } = require('../shared/answerWindow');

const TABLE = process.env.TABLE_NAME;

module.exports = async function vote(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'userId', 'storyIndex', 'selectedOptionId', 'groupId']);
  const { eventId, userId, selectedOptionId, groupId } = body;

  const storyIndex = Number(body.storyIndex);
  if (!Number.isInteger(storyIndex) || storyIndex < 0) {
    throw { statusCode: 400, message: 'Invalid storyIndex' };
  }

  const paddedIndex = String(storyIndex).padStart(3, '0');

  // Fetch META and STORY in parallel — storyIndex is known from the request body
  const [metaResult, storyResult] = await Promise.all([
    db.send(new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: 'META' } })),
    db.send(new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: `STORY#${paddedIndex}` } })),
  ]);

  if (!metaResult.Item) throw { statusCode: 404, message: 'Event not found' };
  if (metaResult.Item.status !== 'active') throw { statusCode: 400, message: 'Event is not active' };
  const answerWindow = deriveAnswerWindow(metaResult.Item);
  if (!answerWindow.answersOpen) {
    throw { statusCode: 400, message: 'Answers are closed for this story' };
  }
  if (Number(metaResult.Item.currentStoryIndex) !== storyIndex) {
    throw { statusCode: 400, message: 'Story index mismatch — event has moved to a different story' };
  }
  if (!storyResult.Item) throw { statusCode: 404, message: 'Story not found' };

  const story = storyResult.Item;
  const group = (story.optionGroups || []).find(g => g.id === groupId);
  if (!group) throw { statusCode: 400, message: 'Invalid groupId for this story' };

  const option = (group.options || []).find(o => o.id === selectedOptionId);
  if (!option) throw { statusCode: 400, message: 'Invalid selectedOptionId for this group' };

  const scoreAwarded = typeof option.score === 'number' ? option.score : 0;
  const now = new Date();
  const submittedAt = now.toISOString();
  const openedTs = metaResult.Item?.answersOpenedAt
    ? new Date(metaResult.Item.answersOpenedAt).getTime()
    : NaN;
  const submittedTs = now.getTime();
  const responseTimeMs = Number.isFinite(openedTs)
    ? Math.max(0, submittedTs - openedTs)
    : 0;

  // Conditional PutItem prevents duplicate votes
  try {
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`, SK: `ANSWER#${userId}#${storyIndex}`,
        userId, storyIndex, groupId, selectedOptionId, scoreAwarded,
        submittedAt,
        responseTimeMs,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
  } catch (condErr) {
    if (condErr.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 409, message: 'Already voted for this story' };
    }
    throw condErr;
  }

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `STORY#${paddedIndex}` },
    UpdateExpression: 'SET voteCounts.#optId = if_not_exists(voteCounts.#optId, :zero) + :one ADD totalVotes :one',
    ExpressionAttributeNames: { '#optId': selectedOptionId },
    ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
  }));

  const userResult = await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `USER#${userId}` },
    UpdateExpression: 'ADD totalScore :score, totalResponseTimeMs :responseTimeMs, answeredCount :one',
    ExpressionAttributeValues: {
      ':score': scoreAwarded,
      ':responseTimeMs': responseTimeMs,
      ':one': 1,
    },
    ReturnValues: 'UPDATED_NEW',
  }));

  return c.json({
    keyTakeaway: story.keyTakeaway,
    scoreAwarded,
    totalScore: userResult.Attributes?.totalScore ?? scoreAwarded,
  });
};
