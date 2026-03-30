const { GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;

module.exports = async function getEvent(c) {
  const eventId = c.req.param('eventId');

  const [metaResult, storiesResult, charactersResult] = await Promise.all([
    db.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
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
  ]);

  const meta = metaResult.Item || null;
  const stories = storiesResult.Items || [];
  const characters = charactersResult.Items || [];

  if (!meta) throw { statusCode: 404, message: 'Event not found' };

  stories.sort((a, b) => a.storyIndex - b.storyIndex);

  return c.json({ meta, stories, characters });
};
