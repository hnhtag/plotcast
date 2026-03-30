const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { nanoid } = require('nanoid');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function createEvent(c) {
  const body = await c.req.json();
  requireFields(body, ['title']);
  const { title } = body;

  const eventId = nanoid(8);
  const createdAt = new Date().toISOString();

  await db.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: `EVENT#${eventId}`, SK: 'META', entityType: 'EVENT', eventId, title, status: 'waiting', currentStoryIndex: -1, totalStories: 0, createdAt },
  }));

  return c.json({ eventId, title });
};
