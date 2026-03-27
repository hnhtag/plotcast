const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;

module.exports = async function getEvent(c) {
  const eventId = c.req.param('eventId');

  const result = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `EVENT#${eventId}` },
  }));

  const items = result.Items || [];
  let meta = null;
  const stories = [];
  const characters = [];

  for (const item of items) {
    if (item.SK === 'META') meta = item;
    else if (item.SK === 'ADMIN') { /* skip — don't expose password hash */ }
    else if (item.SK.startsWith('STORY#')) stories.push(item);
    else if (item.SK.startsWith('CHARACTER#')) characters.push(item);
  }

  if (!meta) throw { statusCode: 404, message: 'Event not found' };

  stories.sort((a, b) => a.storyIndex - b.storyIndex);

  return c.json({ meta, stories, characters });
};
