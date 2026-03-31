const { QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { nanoid } = require('nanoid');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');
const { verifyAdminPassword } = require('../shared/adminPassword');

const TABLE = process.env.TABLE_NAME;

async function queryAllEventItems(eventId) {
  const items = [];
  let exclusiveStartKey;

  do {
    const result = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `EVENT#${eventId}` },
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    }));

    items.push(...(result.Items || []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

module.exports = async function duplicateEventSetup(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId', 'password']);
  const { eventId, password } = body;

  await verifyAdminPassword(password);

  const items = await queryAllEventItems(eventId);
  const sourceMeta = items.find(item => item.SK === 'META');
  if (!sourceMeta) throw { statusCode: 404, message: 'Event not found' };

  const stories = items
    .filter(item => item.SK.startsWith('STORY#'))
    .sort((a, b) => a.storyIndex - b.storyIndex);
  const characters = items.filter(item => item.SK.startsWith('CHARACTER#'));

  const newEventId = nanoid(8);
  const now = new Date().toISOString();

  await db.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `EVENT#${newEventId}`,
      SK: 'META',
      entityType: 'EVENT',
      eventId: newEventId,
      title: sourceMeta.title || '',
      status: 'waiting',
      currentStoryIndex: -1,
      totalStories: stories.length,
      autoShowAnswers: sourceMeta.autoShowAnswers !== false,
      answerTimerSec: Number.isFinite(Number(sourceMeta.answerTimerSec)) ? Math.max(0, Math.floor(Number(sourceMeta.answerTimerSec))) : 0,
      answersOpen: false,
      answersOpenedAt: null,
      createdAt: now,
    },
  }));

  for (const story of stories) {
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${newEventId}`,
        SK: story.SK,
        storyIndex: story.storyIndex,
        title: story.title,
        story: story.story,
        keyTakeaway: story.keyTakeaway,
        optionGroups: story.optionGroups || [],
        voteCounts: {},
        totalVotes: 0,
        createdAt: now,
      },
    }));
  }

  for (const character of characters) {
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `EVENT#${newEventId}`,
        SK: character.SK,
        characterId: character.characterId,
        name: character.name,
        description: character.description,
        encouragement: character.encouragement || '',
        imageEmoji: character.imageEmoji || '🎭',
        minScore: character.minScore,
        maxScore: character.maxScore,
        createdAt: now,
      },
    }));
  }

  return c.json({ ok: true, eventId: newEventId, title: sourceMeta.title || '' });
};