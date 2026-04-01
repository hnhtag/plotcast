const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');
const { normalizeRoles } = require('../shared/eventRoles');

const TABLE = process.env.TABLE_NAME;

module.exports = async function updateParticipantRoles(c) {
  const body = await c.req.json();
  requireFields(body, ['eventId']);

  const { eventId } = body;
  const roles = normalizeRoles(body.roles);

  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `EVENT#${eventId}`, SK: 'META' },
      UpdateExpression: 'SET #roles = :roles',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: {
        '#roles': 'roles',
      },
      ExpressionAttributeValues: {
        ':roles': roles,
      },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw { statusCode: 404, message: 'Event not found' };
    }
    throw err;
  }

  return c.json({ ok: true, roles });
};