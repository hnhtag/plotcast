const { GetCommand, DeleteCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function deleteStory(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'storyIndex']);
  const { eventId, storyIndex } = body;

  const result = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `EVENT#${eventId}`, ':prefix': 'STORY#' },
  }));

  const stories = (result.Items || []).sort((a, b) => a.storyIndex - b.storyIndex);
  const targetIdx = parseInt(storyIndex, 10);

  if (!stories.find(s => s.storyIndex === targetIdx)) {
    throw { statusCode: 404, message: 'Story not found' };
  }

  await db.send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: `STORY#${String(targetIdx).padStart(3, '0')}` },
  }));

  const remaining = stories.filter(s => s.storyIndex !== targetIdx);
  for (let i = 0; i < remaining.length; i++) {
    const s = remaining[i];
    if (s.storyIndex !== i) {
      await db.send(new DeleteCommand({
        TableName: TABLE,
        Key: { PK: `EVENT#${eventId}`, SK: `STORY#${String(s.storyIndex).padStart(3, '0')}` },
      }));
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { ...s, SK: `STORY#${String(i).padStart(3, '0')}`, storyIndex: i },
      }));
    }
  }

  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
    UpdateExpression: 'SET totalStories = :n',
    ExpressionAttributeValues: { ':n': remaining.length },
  }));

  return c.json({ ok: true, totalStories: remaining.length });
};
