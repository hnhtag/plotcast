function normalizeRoleLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];

  const seen = new Set();
  const normalized = [];

  for (const role of roles) {
    const cleanRole = normalizeRoleLabel(role);
    if (!cleanRole) continue;
    if (cleanRole.length > 50) {
      throw { statusCode: 400, message: 'Each role must be 1-50 characters' };
    }

    const dedupeKey = cleanRole.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(cleanRole);

    if (normalized.length > 20) {
      throw { statusCode: 400, message: 'You can configure up to 20 roles per event' };
    }
  }

  return normalized;
}

function validateSelectedRole(role, allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return '';

  const cleanRole = normalizeRoleLabel(role);
  if (!cleanRole) {
    throw { statusCode: 400, message: 'Role is required' };
  }
  if (!allowedRoles.includes(cleanRole)) {
    throw { statusCode: 400, message: 'Invalid role' };
  }

  return cleanRole;
}

module.exports = {
  normalizeRoles,
  validateSelectedRole,
};