const mongoose = require('mongoose');
const User = require('../models/userModel');
const Role = require('../models/roleModel');
const { loadBranchIdFromUserDoc } = require('./branchScope');

/** Reliable compare for Mongoose/ObjectId vs string refs (fixes branch-scoped Role ↔ User mismatch). */
function branchOidMaybe(v) {
  if (v == null || v === '') return null;
  if (v instanceof mongoose.Types.ObjectId) return v;
  if (typeof v === 'object' && v._id != null && mongoose.Types.ObjectId.isValid(String(v._id))) {
    return new mongoose.Types.ObjectId(String(v._id));
  }
  const s = String(v);
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

function branchIdsMatch(roleBranchId, userBranchId) {
  const a = branchOidMaybe(roleBranchId);
  const b = branchOidMaybe(userBranchId);
  if (!a || !b) return false;
  return a.equals(b);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

/**
 * Resolve Role document for a user.role slug. Prefer branch-scoped row when `userBranchId` is set,
 * then global template (branchId null), so each branch can define the same key independently.
 */
async function findRoleDocForLogin(rawRole, userBranchId) {
  for (const key of roleKeyCandidates(rawRole)) {
    if (userBranchId && mongoose.Types.ObjectId.isValid(String(userBranchId))) {
      const bid = new mongoose.Types.ObjectId(String(userBranchId));
      const scoped = await Role.findOne({ key, branchId: bid }).lean();
      if (scoped) return scoped;
    }
    const globalDoc = await Role.findOne({
      key,
      $or: [{ branchId: null }, { branchId: { $exists: false } }],
    }).lean();
    if (globalDoc) return globalDoc;
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

  let effectiveBranchId = userDoc.branchId || null;
  if (!effectiveBranchId) {
    effectiveBranchId = await loadBranchIdFromUserDoc(uid);
  }

  const roleDoc = await findRoleDocForLogin(userDoc.role, effectiveBranchId);
  if (!roleDoc || roleDoc.isSystem) return userDoc;

  if (roleDoc.branchId) {
    const userBr = effectiveBranchId || userDoc.branchId;
    if (!branchIdsMatch(roleDoc.branchId, userBr)) {
      return User.findByIdAndUpdate(uid, { tabs: [] }, { new: true }).lean().exec();
    }
  }

  const perms = Array.isArray(roleDoc.permissions) ? roleDoc.permissions : [];
  return User.findByIdAndUpdate(uid, { tabs: perms }, { new: true }).lean().exec();
}

/**
 * After Role.permissions save, refresh User.tabs for every user whose slug matches `roleDoc.key`,
 * without requiring re-login or relying on flaky string branch compares.
 */
async function propagateTabsToUsersMatchingRole(roleDoc) {
  if (!roleDoc || roleDoc.key == null || roleDoc.isSystem) return 0;
  const ck = [...new Set(roleKeyCandidates(roleDoc.key))];
  const orClause = ck.map((k) => ({ role: new RegExp(`^${escapeRegExp(k)}$`, 'i') }));
  let count = 0;
  const cursor = User.find({ $or: orClause }).select('_id role branchId departmentId').cursor();
  for await (const u of cursor) {
    await refreshUserTabsFromRole(u.toObject({ virtuals: false }));
    count += 1;
  }
  return count;
}

module.exports = {
  refreshUserTabsFromRole,
  findRoleDocForLogin,
  roleKeyCandidates,
  propagateTabsToUsersMatchingRole,
};
