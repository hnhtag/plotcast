const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;
const CHARACTER_CACHE_TTL_MS = Number(process.env.CHARACTER_CACHE_TTL_MS || 30000);
const characterCache = new Map();

function assignCharacter(totalScore, characters) {
  return characters.find(c => totalScore >= c.minScore && totalScore <= c.maxScore) || null;
}

function sortCharacters(characters) {
  return [...characters].sort((a, b) => {
    const minDiff = (a.minScore || 0) - (b.minScore || 0);
    if (minDiff !== 0) return minDiff;

    const maxDiff = (a.maxScore || 0) - (b.maxScore || 0);
    if (maxDiff !== 0) return maxDiff;

    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function toPublicCharacter(character) {
  if (!character) return null;
  return {
    name: character.name,
    description: character.description,
    imageEmoji: character.imageEmoji,
  };
}

function buildMotivation(totalScore, character) {
  if (character?.name) {
    return `You are tracking toward ${character.name}. Keep going, your next choice can shift your destiny.`;
  }
  if (totalScore < 0) {
    return 'Tough chapter, but every story has a comeback. Make your next move count.';
  }
  if (totalScore > 0) {
    return 'Solid momentum. Stay sharp and build on your lead.';
  }
  return 'You are just getting started. The next choice can change everything.';
}

function getCachedCharacters(eventId) {
  const cached = characterCache.get(eventId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    characterCache.delete(eventId);
    return null;
  }
  return cached.value;
}

function setCachedCharacters(eventId, characters) {
  characterCache.set(eventId, {
    value: characters,
    expiresAt: Date.now() + CHARACTER_CACHE_TTL_MS,
  });
}

async function getCharactersForEvent(eventId) {
  const cached = getCachedCharacters(eventId);
  if (cached) return cached;

  const charactersResult = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `EVENT#${eventId}`,
      ':sk': 'CHARACTER#',
    },
  }));

  const characters = sortCharacters(charactersResult.Items || []);
  setCachedCharacters(eventId, characters);
  return characters;
}

function sortUsersForRank(users) {
  return [...users].sort((a, b) => {
    const scoreDiff = (b.totalScore || 0) - (a.totalScore || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const at = new Date(a.joinedAt || 0).getTime();
    const bt = new Date(b.joinedAt || 0).getTime();
    if (at !== bt) return at - bt;

    const an = String(a.nickname || '').toLowerCase();
    const bn = String(b.nickname || '').toLowerCase();
    const nameDiff = an.localeCompare(bn);
    if (nameDiff !== 0) return nameDiff;

    return String(a.userId || a.SK).localeCompare(String(b.userId || b.SK));
  });
}

function calculateRank(users, userId) {
  if (!userId || !users.length) return null;

  let previousScore = null;
  let previousRank = 0;

  for (let i = 0; i < users.length; i += 1) {
    const score = users[i].totalScore || 0;
    const rank = previousScore === score ? previousRank : i + 1;
    previousScore = score;
    previousRank = rank;

    if ((users[i].userId || '').toString() === userId.toString()) {
      return rank;
    }
  }

  return null;
}

module.exports = async function getPlayerState(c) {
  const eventId = c.req.param('eventId');
  const userId = c.req.param('userId');

  const [metaResult, userResult] = await Promise.all([
    db.send(new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: 'META' } })),
    db.send(new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: `USER#${userId}` } })),
  ]);

  if (!metaResult.Item) throw { statusCode: 404, message: 'Event not found' };

  const meta = metaResult.Item;
  const user = userResult.Item || null;
  let characters = [];
  if (user) {
    characters = await getCharactersForEvent(eventId);
  }
  const totalScore = user?.totalScore || 0;
  const currentCharacter = assignCharacter(totalScore, characters);

  let rank = null;
  if (user && meta.status === 'finished') {
    const usersResult = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':sk': 'USER#',
      },
    }));
    const rankedUsers = sortUsersForRank(usersResult.Items || []);
    rank = calculateRank(rankedUsers, userId);
  }

  const response = {
    eventId,
    userId,
    status: meta.status,
    title: meta.title,
    currentStoryIndex: meta.currentStoryIndex,
    totalStories: meta.totalStories,
    joined: Boolean(user),
    nickname: user?.nickname || '',
    totalScore,
    rank,
    currentCharacter: toPublicCharacter(currentCharacter),
    motivation: buildMotivation(totalScore, currentCharacter),
    hasVotedCurrentStory: false,
  };

  if (user && meta.status === 'active' && meta.currentStoryIndex >= 0) {
    const answerResult = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `ANSWER#${userId}#${meta.currentStoryIndex}` },
    }));
    response.hasVotedCurrentStory = Boolean(answerResult.Item);
  }

  return c.json(response);
};