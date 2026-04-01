const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { deriveAnswerWindow } = require('../shared/answerWindow');
const { sortUsersForRanking, getRankKey } = require('../shared/ranking');

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
    encouragement: character.encouragement,
    imageEmoji: character.imageEmoji,
  };
}

function buildMotivation(totalScore, character) {
  if (character?.encouragement) {
    return character.encouragement;
  }
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

module.exports = async function getPlayerState(c) {
  const eventId = c.req.param('eventId');
  const userId = c.req.param('userId');

  const [metaResult, userResult] = await Promise.all([
    db.send(new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: 'META' } })),
    db.send(new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: `USER#${userId}` } })),
  ]);

  if (!metaResult.Item) throw { statusCode: 404, message: 'Event not found' };

  const meta = metaResult.Item;
  const answerWindow = deriveAnswerWindow(meta);
  const user = userResult.Item || null;
  let characters = [];
  if (user) {
    characters = await getCharactersForEvent(eventId);
  }
  const totalScore = user?.totalScore || 0;
  const currentCharacter = assignCharacter(totalScore, characters);

  let rank = null;
  const isFinished = meta.status === 'finished';
  if (isFinished && user) {
    const allUsersResp = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :u)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':u': 'USER#',
      },
    }));

    const users = sortUsersForRanking(allUsersResp.Items || []);
    const idx = users.findIndex(u => (u.userId || u.SK?.replace('USER#', '')) === userId);

    if (idx >= 0) {
      const myRankKey = getRankKey(users[idx]);
      rank = idx + 1;
      for (let i = idx - 1; i >= 0; i -= 1) {
        if (getRankKey(users[i]) === myRankKey) {
          rank = i + 1;
        } else {
          break;
        }
      }
    }
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
    role: user?.role || '',
    totalScore,
    rank,
    autoShowAnswers: answerWindow.autoShowAnswers,
    answerTimerSec: answerWindow.answerTimerSec,
    answersOpen: answerWindow.answersOpen,
    answersOpenedAt: answerWindow.answersOpenedAt,
    answerEndsAt: answerWindow.answerEndsAt,
    answerRemainingSec: answerWindow.answerRemainingSec,
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