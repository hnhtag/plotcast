const { GetCommand } = require('@aws-sdk/lib-dynamodb');
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
      const { keyTakeaway, voteCounts, totalVotes, ...storyPublic } = storyResult.Item;
      response.story = storyPublic;
      response.voteCounts = voteCounts || {};
      response.totalVotes = totalVotes || 0;
    }
  }

  return c.json(response);
};
