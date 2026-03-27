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

  users.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  const total = users.length;
  const leaderboardData = users.map((user, idx) => {
    const rank = idx + 1;
    const isTop3 = rank <= 3;
    const isBottom3 = rank > total - 3 && total > 3;
    const character = assignCharacter(user.totalScore || 0, characters);

    return {
      rank,
      nickname: isTop3 ? user.nickname : isBottom3 ? maskNickname(user.nickname) : user.nickname,
      totalScore: user.totalScore || 0,
      isMasked: isBottom3 && !isTop3,
      character: character
        ? { name: character.name, description: character.description, imageEmoji: character.imageEmoji }
        : null,
    };
  });

  return c.json({ leaderboard: leaderboardData, totalParticipants: total });
};
