const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { getResponseTimeForRanking, sortUsersForRanking, getRankKey } = require('../shared/ranking');

const TABLE = process.env.TABLE_NAME;
const CHARACTER_CACHE_TTL_MS = Number(process.env.CHARACTER_CACHE_TTL_MS || 30000);
const FINISHED_LEADERBOARD_CACHE_TTL_MS = Number(process.env.FINISHED_LEADERBOARD_CACHE_TTL_MS || 15000);

const characterCache = new Map();
const finishedLeaderboardCache = new Map();

function maskNickname(nickname) {
  if (!nickname || nickname.length <= 1) return '***';
  return nickname[0] + '***';
}

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
    minScore: character.minScore,
    maxScore: character.maxScore,
  };
}

function getCached(map, key) {
  const cached = map.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    map.delete(key);
    return null;
  }
  return cached.value;
}

function setCached(map, key, value, ttlMs) {
  map.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

async function getCharactersForEvent(eventId) {
  const cached = getCached(characterCache, eventId);
  if (cached) return cached;

  const charactersResult = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `EVENT#${eventId}`,
      ':sk': 'CHARACTER#',
    },
  }));

  const sortedCharacters = sortCharacters(charactersResult.Items || []);
  setCached(characterCache, eventId, sortedCharacters, CHARACTER_CACHE_TTL_MS);
  return sortedCharacters;
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function scoreStats(scores) {
  if (!scores.length) {
    return {
      min: 0,
      max: 0,
      median: 0,
      q1: 0,
      q3: 0,
      stdDev: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const mean = scores.reduce((s, n) => s + n, 0) / scores.length;
  const variance = scores.reduce((s, n) => s + (n - mean) * (n - mean), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  const positiveCount = scores.filter(s => s > 0).length;
  const negativeCount = scores.filter(s => s < 0).length;
  const neutralCount = scores.length - positiveCount - negativeCount;

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    median: Number(median.toFixed(2)),
    q1: Number(q1.toFixed(2)),
    q3: Number(q3.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    positiveCount,
    negativeCount,
    neutralCount,
  };
}

module.exports = async function leaderboard(c) {
  const eventId = c.req.param('eventId');

  const metaResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));

  const meta = metaResult.Item || null;

  if (!meta) throw { statusCode: 404, message: 'Event not found' };

  if (meta.status === 'finished') {
    const finishedCached = getCached(finishedLeaderboardCache, eventId);
    if (finishedCached) return c.json(finishedCached);
  } else {
    finishedLeaderboardCache.delete(eventId);
  }

  const [usersResult, sortedCharacters] = await Promise.all([
    db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':sk': 'USER#',
      },
    })),
    getCharactersForEvent(eventId),
  ]);

  const users = usersResult.Items || [];

  const usersByParticipantIndex = [...users].sort((a, b) => {
    const an = String(a.nickname || '').toLowerCase();
    const bn = String(b.nickname || '').toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return String(a.userId || a.SK).localeCompare(String(b.userId || b.SK));
  });

  const participantIndexMap = new Map();
  usersByParticipantIndex.forEach((user, idx) => {
    const key = user.userId || user.SK;
    participantIndexMap.set(key, idx + 1);
  });

  const rankedUsers = sortUsersForRanking(users);

  const total = rankedUsers.length;
  const totalScoreSum = rankedUsers.reduce((sum, user) => sum + (user.totalScore || 0), 0);
  const averageScore = total > 0 ? totalScoreSum / total : 0;
  const averageCharacter = assignCharacter(averageScore, sortedCharacters);
  const stats = scoreStats(rankedUsers.map(user => user.totalScore || 0));

  let previousRankKey = null;
  let previousRank = 0;

  const leaderboardData = rankedUsers.map((user, idx) => {
    const score = user.totalScore || 0;
    const rankKey = getRankKey(user);
    const rank = previousRankKey === rankKey ? previousRank : idx + 1;
    previousRankKey = rankKey;
    previousRank = rank;

    const isTop3 = rank <= 3;
    const isBottom3 = idx >= total - 3 && total > 3;
    const character = assignCharacter(user.totalScore || 0, sortedCharacters);

    return {
      rank,
      nickname: isTop3 ? user.nickname : isBottom3 ? maskNickname(user.nickname) : user.nickname,
      totalScore: score,
      totalResponseTimeMs: getResponseTimeForRanking(user),
      isMasked: isBottom3 && !isTop3,
      character: toPublicCharacter(character),
    };
  });

  const scorePoints = rankedUsers.map((user, idx) => {
    const score = user.totalScore || 0;
    const rank = leaderboardData[idx]?.rank || idx + 1;
    const isTop3 = rank <= 3;
    const isBottom3 = idx >= total - 3 && total > 3;
    const key = user.userId || user.SK;

    return {
      rank,
      participantIndex: participantIndexMap.get(key) || idx + 1,
      nickname: isTop3 ? user.nickname : isBottom3 ? maskNickname(user.nickname) : user.nickname,
      totalScore: score,
      totalResponseTimeMs: getResponseTimeForRanking(user),
      isMasked: isBottom3 && !isTop3,
    };
  });

  const payload = {
    leaderboard: leaderboardData,
    totalParticipants: total,
    averageScore: Number(averageScore.toFixed(2)),
    averageCharacter: toPublicCharacter(averageCharacter),
    sortedCharacters: sortedCharacters.map(toPublicCharacter),
    scoreStats: stats,
    scorePoints,
  };

  if (meta.status === 'finished') {
    setCached(finishedLeaderboardCache, eventId, payload, FINISHED_LEADERBOARD_CACHE_TTL_MS);
  }

  return c.json(payload);
};
