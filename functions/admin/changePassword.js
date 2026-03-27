const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const db = require('../shared/db');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function changePassword(c) {
  const body = await c.req.json();
  requireFields(body, ['currentPassword', 'newPassword']);
  const { currentPassword, newPassword } = body;

  if (newPassword.length < 6) throw { statusCode: 400, message: 'New password must be at least 6 characters' };

  // Check global admin password
  const adminResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: 'GLOBAL', SK: 'ADMIN' },
  }));

  if (adminResult.Item) {
    const match = await bcrypt.compare(currentPassword, adminResult.Item.passwordHash);
    if (!match) throw { statusCode: 401, message: 'Current password is incorrect' };
  } else {
    const defaultPassword = process.env.ADMIN_PASSWORD || '12345678';
    if (currentPassword !== defaultPassword) throw { statusCode: 401, message: 'Current password is incorrect' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: 'GLOBAL', SK: 'ADMIN', passwordHash, updatedAt: new Date().toISOString() },
  }));

  return c.json({ ok: true });
};
