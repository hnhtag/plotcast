const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const db = require('../shared/db');
const { signAdminToken } = require('../shared/auth');
const { requireFields } = require('../shared/validate');

const TABLE = process.env.TABLE_NAME;

module.exports = async function login(c) {
  const body = await c.req.json();
  requireFields(body, ['password']);
  const { password } = body;

  // Verify global admin password
  const adminResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: 'GLOBAL', SK: 'ADMIN' },
  }));

  if (adminResult.Item) {
    const match = await bcrypt.compare(password, adminResult.Item.passwordHash);
    if (!match) throw { statusCode: 401, message: 'Invalid password' };
  } else {
    // First login: compare against env var, then persist the hash
    const defaultPassword = process.env.ADMIN_PASSWORD || '12345678';
    if (password !== defaultPassword) throw { statusCode: 401, message: 'Invalid password' };
    const passwordHash = await bcrypt.hash(password, 10);
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: { PK: 'GLOBAL', SK: 'ADMIN', passwordHash, createdAt: new Date().toISOString() },
    }));
  }

  return c.json({ token: signAdminToken() });
};
