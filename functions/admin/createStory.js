const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function createStory(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'title', 'story', 'keyTakeaway', 'optionGroups']);
  const { eventId, title, story, keyTakeaway, optionGroups } = body;

  if (!Array.isArray(optionGroups) || optionGroups.length === 0) {
    throw { statusCode: 400, message: 'optionGroups must be a non-empty array' };
  }

  const metaResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));
  if (!metaResult.Item) throw { statusCode: 404, message: 'Event not found' };

  const storyIndex = metaResult.Item.totalStories;
  const paddedIndex = String(storyIndex).padStart(3, '0');

  await db.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: `EVENT#${eventId}`, SK: `STORY#${paddedIndex}`, storyIndex, title, story, keyTakeaway, optionGroups, voteCounts: {}, totalVotes: 0, createdAt: new Date().toISOString() },
  }));
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
    UpdateExpression: 'ADD totalStories :one',
    ExpressionAttributeValues: { ':one': 1 },
  }));

  return c.json({ storyIndex, paddedIndex });
};
