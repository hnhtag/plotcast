const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;

module.exports = async function getState(c) {
  const eventId = c.req.param('eventId');

  const metaResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `EVENT#${eventId}`, SK: 'META' },
  }));
  if (!metaResult.Item) throw { statusCode: 404, message: 'Event not found' };

  const meta = metaResult.Item;
  const response = {
    status: meta.status,
    currentStoryIndex: meta.currentStoryIndex,
    totalStories: meta.totalStories,
    title: meta.title,
  };

  if (meta.status === 'active' && meta.currentStoryIndex >= 0) {
    const paddedIndex = String(meta.currentStoryIndex).padStart(3, '0');

    const storyResult = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: `STORY#${paddedIndex}` },
    }));

    if (storyResult.Item) {
      // Strip keyTakeaway — only returned after voting
      const { keyTakeaway, ...storyPublic } = storyResult.Item;
      response.story = storyPublic;
    }

    const answersResult = await db.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'storyIndex = :si',
      ExpressionAttributeValues: {
        ':pk': `EVENT#${eventId}`,
        ':prefix': 'ANSWER#',
        ':si': meta.currentStoryIndex,
      },
    }));

    const voteCounts = {};
    let totalVotes = 0;
    for (const answer of (answersResult.Items || [])) {
      const optId = answer.selectedOptionId;
      voteCounts[optId] = (voteCounts[optId] || 0) + 1;
      totalVotes++;
    }

    response.voteCounts = voteCounts;
    response.totalVotes = totalVotes;
  }

  return c.json(response);
};
