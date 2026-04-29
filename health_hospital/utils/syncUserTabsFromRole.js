const User = require('../models/userModel');
const Role = require('../models/roleModel');

/** Align keys with Role documents + common UI variants (spaces, hyphens). */
function roleKeyCandidates(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  const lower = s.toLowerCase();
  return [
    ...new Set(
      [
        lower.replace(/\s+/g, '_').replace(/-/g, '_'),
        lower.replace(/\s+/g, ''),
        lower.replace(/-/g, '').replace(/\s+/g, ''),
      ].filter(Boolean),
    ),
  ];
}

async function findRoleDocForLogin(rawRole) {
  for (const key of roleKeyCandidates(rawRole)) {
    const doc = await Role.findOne({ key }).lean();
    if (doc) return doc;
  }
  return null;
}

/**
 * Applies Role.permissions to User.tabs when user.role matches a custom Role row.
 * Persists so login/session payloads include mp.* keys for the SPA sidebar.
 */
async function refreshUserTabsFromRole(userDoc) {
  const uid = userDoc?._id || userDoc?.id;
  if (!uid) return userDoc;

  const roleDoc = await findRoleDocForLogin(userDoc.role);
  if (!roleDoc || roleDoc.isSystem) return userDoc;

  if (roleDoc.branchId) {
    const rb = String(roleDoc.branchId);
    const ub = String(userDoc.branchId || '');
    if (!ub || rb !== ub) {
      return User.findByIdAndUpdate(uid, { tabs: [] }, { new: true }).lean().exec();
    }
  }

  const perms = Array.isArray(roleDoc.permissions) ? roleDoc.permissions : [];
  return User.findByIdAndUpdate(uid, { tabs: perms }, { new: true }).lean().exec();
}

module.exports = {
  refreshUserTabsFromRole,
  findRoleDocForLogin,
  roleKeyCandidates,
};
