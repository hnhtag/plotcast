const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;

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

module.exports = async function getPlayerState(c) {
  const eventId = c.req.param('eventId');
  const userId = c.req.param('userId');

  const [metaResult, userResult, charactersResult] = await Promise.all([
    db.send(new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: 'META' } })),
    db.send(new GetCommand({ TableName: TABLE, Key: { PK: `EVENT#${eventId}`, SK: `USER#${userId}` } })),
    db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':sk': 'CHARACTER#',
      },
    })),
  ]);

  if (!metaResult.Item) throw { statusCode: 404, message: 'Event not found' };

  const meta = metaResult.Item;
  const user = userResult.Item || null;
  const characters = sortCharacters(charactersResult.Items || []);
  const totalScore = user?.totalScore || 0;
  const currentCharacter = assignCharacter(totalScore, characters);

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