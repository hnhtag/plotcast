const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRY = parseInt(process.env.JWT_EXPIRY || '14400', 10);

function signAdminToken() {
  return jwt.sign({ role: 'admin' }, SECRET, { expiresIn: EXPIRY });
}

function verifyAdminToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { statusCode: 401, message: 'Missing authorization token' };
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== 'admin') {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    return payload;
  } catch (e) {
    if (e.statusCode) throw e;
    throw { statusCode: 401, message: 'Invalid or expired token' };
  }
}

// Hono middleware — verifies JWT and sets adminPayload on context
async function adminAuth(c, next) {
  const payload = verifyAdminToken(c.req.header('Authorization'));
  c.set('adminPayload', payload);
  await next();
}

module.exports = { signAdminToken, verifyAdminToken, adminAuth };
