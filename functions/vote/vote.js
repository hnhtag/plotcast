const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function vote(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'userId', 'storyIndex', 'selectedOptionId', 'groupId']);
  const { eventId, userId, storyIndex, selectedOptionId, groupId } = body;

  const metaResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));
  if (!metaResult.Item) throw { statusCode: 404, message: 'Event not found' };
  if (metaResult.Item.status !== 'active') throw { statusCode: 400, message: 'Event is not active' };
  if (metaResult.Item.currentStoryIndex !== storyIndex) {
    throw { statusCode: 400, message: 'Story index mismatch — event has moved to a different story' };
  }

  const paddedIndex = String(storyIndex).padStart(3, '0');
  const storyResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `STORY#${paddedIndex}` },
  }));
  if (!storyResult.Item) throw { statusCode: 404, message: 'Story not found' };

  const story = storyResult.Item;
  const group = (story.optionGroups || []).find(g => g.id === groupId);
  if (!group) throw { statusCode: 400, message: 'Invalid groupId' };

  const option = (group.options || []).find(o => o.id === selectedOptionId);
  if (!option) throw { statusCode: 400, message: 'Invalid selectedOptionId' };

  const scoreAwarded = typeof option.score === 'number' ? option.score : 0;

  // Conditional PutItem prevents duplicate votes
  try {
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${eventId}`, SK: `ANSWER#${userId}#${storyIndex}`,
        userId, storyIndex, groupId, selectedOptionId, scoreAwarded,
        submittedAt: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
  } catch (condErr) {
    if (condErr.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 409, message: 'Already voted for this story' };
    }
    throw condErr;
  }

  const userResult = await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `USER#${userId}` },
    UpdateExpression: 'ADD totalScore :score',
    ExpressionAttributeValues: { ':score': scoreAwarded },
    ReturnValues: 'UPDATED_NEW',
  }));

  return c.json({
    keyTakeaway: story.keyTakeaway,
    scoreAwarded,
    totalScore: userResult.Attributes?.totalScore ?? scoreAwarded,
  });
};
