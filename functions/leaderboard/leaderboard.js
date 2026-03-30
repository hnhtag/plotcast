const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;

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
    imageEmoji: character.imageEmoji,
    minScore: character.minScore,
    maxScore: character.maxScore,
  };
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

  const result = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `EVENT#${eventId}` },
  }));

  const items = result.Items || [];
  const users = [];
  const characters = [];
  let meta = null;

  for (const item of items) {
    if (item.SK === 'META') meta = item;
    else if (item.SK.startsWith('USER#')) users.push(item);
    else if (item.SK.startsWith('CHARACTER#')) characters.push(item);
  }

  if (!meta) throw { statusCode: 404, message: 'Event not found' };

  const sortedCharacters = sortCharacters(characters);

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

  users.sort((a, b) => {
    const scoreDiff = (b.totalScore || 0) - (a.totalScore || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const at = new Date(a.joinedAt || 0).getTime();
    const bt = new Date(b.joinedAt || 0).getTime();
    if (at !== bt) return at - bt;

    return String(a.userId || a.SK).localeCompare(String(b.userId || b.SK));
  });

  const total = users.length;
  const totalScoreSum = users.reduce((sum, user) => sum + (user.totalScore || 0), 0);
  const averageScore = total > 0 ? totalScoreSum / total : 0;
  const averageCharacter = assignCharacter(averageScore, sortedCharacters);
  const stats = scoreStats(users.map(user => user.totalScore || 0));

  let previousScore = null;
  let previousRank = 0;

  const leaderboardData = users.map((user, idx) => {
    const score = user.totalScore || 0;
    const rank = previousScore === score ? previousRank : idx + 1;
    previousScore = score;
    previousRank = rank;

    const isTop3 = rank <= 3;
    const isBottom3 = idx >= total - 3 && total > 3;
    const character = assignCharacter(user.totalScore || 0, sortedCharacters);

    return {
      rank,
      nickname: isTop3 ? user.nickname : isBottom3 ? maskNickname(user.nickname) : user.nickname,
      totalScore: score,
      isMasked: isBottom3 && !isTop3,
      character: toPublicCharacter(character),
    };
  });

  const scorePoints = users.map((user, idx) => {
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
      isMasked: isBottom3 && !isTop3,
    };
  });

  return c.json({
    leaderboard: leaderboardData,
    totalParticipants: total,
    averageScore: Number(averageScore.toFixed(2)),
    averageCharacter: toPublicCharacter(averageCharacter),
    sortedCharacters: sortedCharacters.map(toPublicCharacter),
    scoreStats: stats,
    scorePoints,
  });
};
