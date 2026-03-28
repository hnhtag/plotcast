const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');

const TABLE = process.env.TABLE_NAME;

module.exports = async function listEvents(c) {
  const result = await db.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'SK = :meta AND begins_with(PK, :prefix)',
    ExpressionAttributeValues: {
      ':meta': 'META',
      ':prefix': 'EVENT#',
    },
    ProjectionExpression: 'PK, eventId, title, createdAt, #st',
    ExpressionAttributeNames: { '#st': 'status' },
  }));

  const events = (result.Items || []).map(item => ({
    eventId: item.eventId || item.PK.replace('EVENT#', ''),
    title: item.title || '',
    createdAt: item.createdAt || null,
    status: item.status || null,
  }));

  events.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return c.json({ events });
};
