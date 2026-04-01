const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { sortUsersForRanking, getRankKey, getResponseTimeForRanking } = require('../shared/ranking');

const TABLE = process.env.TABLE_NAME;

function assignCharacter(totalScore, characters) {
  return characters.find(character => totalScore >= character.minScore && totalScore <= character.maxScore) || null;
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

function buildRankedPlayers(users, characters) {
  const rankedUsers = sortUsersForRanking(users);
  let previousRankKey = null;
  let previousRank = 0;

  return rankedUsers.map((user, idx) => {
    const rankKey = getRankKey(user);
    const rank = previousRankKey === rankKey ? previousRank : idx + 1;
    previousRankKey = rankKey;
    previousRank = rank;

    const totalScore = Number(user.totalScore || 0);
    const character = assignCharacter(totalScore, characters);
    const totalResponseTimeMs = getResponseTimeForRanking(user);

    return {
      rank,
      userId: user.userId || user.SK?.replace('USER#', '') || '',
      nickname: user.nickname || '',
      role: user.role || '',
      totalScore,
      totalResponseTimeMs,
      answeredCount: Number(user.answeredCount || 0),
      joinedAt: user.joinedAt || '',
      characterName: character?.name || '',
      characterDescription: character?.description || '',
      characterEmoji: character?.imageEmoji || '',
    };
  });
}

function buildOptionLookup(stories) {
  const lookup = new Map();

  for (const story of stories) {
    for (const group of story.optionGroups || []) {
      for (const option of group.options || []) {
        lookup.set(`${story.storyIndex}:${option.id}`, {
          storyTitle: story.title || '',
          groupTitle: group.title || '',
          optionText: option.text || '',
          optionScore: typeof option.score === 'number' ? option.score : Number(option.score || 0),
        });
      }
    }
  }

  return lookup;
}

function buildStorySetupRows(stories) {
  const rows = [];

  for (const story of stories) {
    const optionGroups = story.optionGroups || [];

    if (optionGroups.length === 0) {
      rows.push({
        storyIndex: Number(story.storyIndex || 0),
        storyTitle: story.title || '',
        storyBody: story.story || '',
        keyTakeaway: story.keyTakeaway || '',
        groupTitle: '',
        optionText: '',
        optionScore: '',
      });
      continue;
    }

    for (const group of optionGroups) {
      const options = group.options || [];

      if (options.length === 0) {
        rows.push({
          storyIndex: Number(story.storyIndex || 0),
          storyTitle: story.title || '',
          storyBody: story.story || '',
          keyTakeaway: story.keyTakeaway || '',
          groupTitle: group.title || '',
          optionText: '',
          optionScore: '',
        });
        continue;
      }

      for (const option of options) {
        rows.push({
          storyIndex: Number(story.storyIndex || 0),
          storyTitle: story.title || '',
          storyBody: story.story || '',
          keyTakeaway: story.keyTakeaway || '',
          groupTitle: group.title || '',
          optionText: option.text || '',
          optionScore: typeof option.score === 'number' ? option.score : Number(option.score || 0),
        });
      }
    }
  }

  return rows;
}

module.exports = async function exportReportData(c) {
  const eventId = c.req.param('eventId');

  const [metaResult, usersResult, storiesResult, charactersResult, answersResult] = await Promise.all([
    db.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
    })),
    db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':sk': 'USER#',
      },
    })),
    db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':sk': 'STORY#',
      },
    })),
    db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':sk': 'CHARACTER#',
      },
    })),
    db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':sk': 'ANSWER#',
      },
    })),
  ]);

  const meta = metaResult.Item || null;
  if (!meta) throw { statusCode: 404, message: 'Event not found' };

  const stories = [...(storiesResult.Items || [])].sort((a, b) => (a.storyIndex || 0) - (b.storyIndex || 0));
  const characters = sortCharacters(charactersResult.Items || []);
  const players = buildRankedPlayers(usersResult.Items || [], characters);
  const storySetup = buildStorySetupRows(stories);
  const optionLookup = buildOptionLookup(stories);
  const playerMap = new Map(players.map(player => [player.userId, player]));
  const answers = answersResult.Items || [];

  const answerByStoryAndUser = new Map();
  for (const answer of answers) {
    answerByStoryAndUser.set(`${answer.storyIndex}:${answer.userId}`, answer);
  }

  const storyVotes = stories.map((story) => {
    const votes = players.map((player) => {
      const answer = answerByStoryAndUser.get(`${story.storyIndex}:${player.userId}`) || null;
      const option = answer ? optionLookup.get(`${story.storyIndex}:${answer.selectedOptionId}`) : null;

      return {
        rank: player.rank,
        userId: player.userId,
        nickname: player.nickname,
        role: player.role,
        totalScore: player.totalScore,
        characterName: player.characterName,
        didVote: Boolean(answer),
        groupTitle: option?.groupTitle || '',
        selectedOptionText: option?.optionText || '',
        optionScore: answer ? Number(answer.scoreAwarded || option?.optionScore || 0) : '',
        responseTimeMs: answer ? Number(answer.responseTimeMs || 0) : '',
        submittedAt: answer?.submittedAt || '',
      };
    });

    return {
      storyIndex: Number(story.storyIndex || 0),
      storyTitle: story.title || `Story ${Number(story.storyIndex || 0) + 1}`,
      votes,
    };
  });

  return c.json({
    eventId,
    title: meta.title || '',
    status: meta.status || 'waiting',
    exportedAt: new Date().toISOString(),
    players,
    storySetup,
    storyVotes,
  });
};