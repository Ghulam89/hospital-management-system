const mongoose = require('mongoose');
const { normalizeRole } = require('./auth');
const { resolveBranchIdForNonSuperAdmin } = require('../utils/branchScope');

function isSuperAdmin(user) {
  const r = normalizeRole(user?.role);
  return r === 'superadmin' || r === 'super admin';
}

function isBranchAdmin(user) {
  const t = String(user?.type || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (t === 'administrator' || t === 'admin') return true;

  const r = normalizeRole(user?.role);
  if (!r) return false;
  if (
    r === 'administrator' ||
    r === 'admin' ||
    r === 'branchadmin' ||
    r === 'branch_admin' ||
    r.startsWith('administrator_') ||
    r.startsWith('admin_')
  ) {
    return true;
  }
  // Custom Roles Manage keys (bariha_admin, dha_admin, …) — anything not a fixed staff screen
  const staff =
    r === 'doctor' ||
    r.startsWith('doctor_') ||
    r === 'nurse' ||
    r.startsWith('nurse_') ||
    r === 'pharmacist' ||
    r === 'sale' ||
    r === 'sales' ||
    r === 'pos' ||
    r.startsWith('pharmacist_') ||
    r.startsWith('sale_') ||
    r.startsWith('sales_') ||
    r.startsWith('pos_') ||
    r === 'accountant' ||
    r.startsWith('accountant_') ||
    r === 'staff' ||
    r.startsWith('staff_') ||
    r === 'reception' ||
    r === 'receptionist' ||
    r.startsWith('reception') ||
    r.includes('reception') ||
    r === 'quality_control_manager' ||
    r.startsWith('quality_control_manager_') ||
    r === 'superadmin' ||
    r === 'super_admin';
  return !staff;
}

/**
 * Resolves the active branch for the request.
 * - Super Admin: body.branchId or query.branchId (optional); may be null (all branches).
 * - Others: user's branch from JWT/DB (never trust body alone).
 */
async function resolveActiveBranchId(req, { allowSuperadminOmit = true } = {}) {
  if (!req.user) return { branchId: null, error: 'Unauthorized' };

  if (isSuperAdmin(req.user)) {
    const raw = req.body?.branchId ?? req.query?.branchId;
    if (raw != null && raw !== '' && mongoose.Types.ObjectId.isValid(String(raw))) {
      return { branchId: new mongoose.Types.ObjectId(String(raw)) };
    }
    if (allowSuperadminOmit) return { branchId: null };
    return { branchId: null, error: 'branchId required for this operation' };
  }

  const branchId = await resolveBranchIdForNonSuperAdmin(req);
  if (!branchId) return { branchId: null, error: 'Branch not resolved for user' };
  return { branchId };
}

/**
 * Superadmin may act as another branch; branch users cannot pass a foreign branchId.
 */
async function assertBranchWritePayload(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
    }
    if (isSuperAdmin(req.user)) return next();

    const bodyBranch = req.body?.branchId;
    if (bodyBranch == null || bodyBranch === '') return next();

    const mine = await resolveBranchIdForNonSuperAdmin(req);
    if (!mine || String(mine) !== String(bodyBranch)) {
      return res.status(403).json({ status: 'fail', message: 'Cannot assign a foreign branch' });
    }
    next();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = {
  isSuperAdmin,
  isBranchAdmin,
  resolveActiveBranchId,
  assertBranchWritePayload,
};
