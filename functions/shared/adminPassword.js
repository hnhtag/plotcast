const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const db = require('./db');

const TABLE = process.env.TABLE_NAME;

async function verifyAdminPassword(password) {
  const adminResult = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: 'GLOBAL', SK: 'ADMIN' },
  }));

  if (adminResult.Item) {
    const match = await bcrypt.compare(password, adminResult.Item.passwordHash);
    if (!match) throw { statusCode: 401, message: 'Invalid password' };
    return;
  }

  const defaultPassword = process.env.ADMIN_PASSWORD || '12345678';
  if (password !== defaultPassword) throw { statusCode: 401, message: 'Invalid password' };
}

module.exports = { verifyAdminPassword };