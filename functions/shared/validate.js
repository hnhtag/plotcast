/**
 * Throws { statusCode: 400, message } if any required field is missing/empty.
 */
function requireFields(body, fields) {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      throw { statusCode: 400, message: `Missing required field: ${field}` };
    }
  }
}

module.exports = { requireFields };
