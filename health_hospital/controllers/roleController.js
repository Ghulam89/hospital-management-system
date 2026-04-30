const mongoose = require('mongoose');
const Role = require('../models/roleModel');
const permissionCatalog = require('../utils/permissionCatalog');
const menuPermissionCatalog = require('../utils/menuPermissionCatalog');
const { normalizeRole } = require('../middleware/auth');
const { resolveBranchIdForNonSuperAdmin } = require('../utils/branchScope');
const { isBranchAdmin } = require('../middleware/rbac');
const { propagateTabsToUsersMatchingRole } = require('../utils/syncUserTabsFromRole');

/** Superadmin may set role.branchId from body; omitempty → global template (`null`). */
function parseOptionalBranchObjectId(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

const CATALOG_KEYS = new Set(
  permissionCatalog.map((item) => item.key).filter(Boolean),
);
const LEGACY_KEYS = new Set(permissionCatalog.LEGACY_EXTRA_KEYS || []);
const MENU_KEYS_SET = new Set(menuPermissionCatalog.flattenMenuPermissionKeys());
const ALLOWED_PERMISSION_KEYS = new Set([...CATALOG_KEYS, ...LEGACY_KEYS, ...MENU_KEYS_SET]);

const normalizeKey = (raw) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

const sanitizePermissions = (input) => {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (const k of input) {
    const key = String(k || '').trim();
    if (!key || !ALLOWED_PERMISSION_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
};

function isSuperAdmin(user) {
  return normalizeRole(user?.role) === 'superadmin';
}

/** Role keys branch admins must not list or edit (HQ-only elevated templates). */
const RESERVED_ELEVATED_ROLE_KEYS = new Set([
  'superadmin',
  'super_admin',
  'administrator',
  'admin',
  'full_access',
]);

function isElevatedRoleKey(rawKey) {
  return RESERVED_ELEVATED_ROLE_KEYS.has(normalizeKey(rawKey));
}

/** First word of display name — catches name "admin" with key "4545" (branch templates). */
function elevatedRoleNameRoot(name) {
  const s = String(name || '').trim().toLowerCase();
  if (!s) return '';
  const first = s.split(/[\s(_-]+/)[0] || '';
  return first.replace(/[^a-z0-9]/g, '');
}

function isElevatedRoleNameRootReserved(root) {
  return root === 'admin' || root === 'administrator' || root === 'superadmin';
}

/** Roles branch admins must not see or edit (HQ / branch-administrator templates). */
function isElevatedRoleHiddenFromBranchViewer(roleLike) {
  if (!roleLike) return false;
  if (isElevatedRoleKey(roleLike.key)) return true;
  return isElevatedRoleNameRootReserved(elevatedRoleNameRoot(roleLike.name));
}

function filterRolesHiddenFromBranchAdmin(req, rows) {
  if (!Array.isArray(rows)) return [];
  if (isSuperAdmin(req.user)) return rows;
  return rows.filter((r) => !isElevatedRoleHiddenFromBranchViewer(r));
}

/** Branch admins see global templates (branchId null) + roles owned by their branch. Superadmin sees all. */
async function rolesFilterForUser(req) {
  if (isSuperAdmin(req.user)) return {};
  const bid = await resolveBranchIdForNonSuperAdmin(req);
  if (!bid) return { branchId: null };
  return { $or: [{ branchId: null }, { branchId: bid }] };
}

async function assertBranchRoleRead(req, roleDoc, res) {
  if (isSuperAdmin(req.user)) return true;
  if (!isBranchAdmin(req.user)) return true;
  const bid = await resolveBranchIdForNonSuperAdmin(req);
  if (!bid) {
    res.status(403).json({ status: 'fail', message: 'Forbidden' });
    return false;
  }
  if (!roleDoc.branchId) return true;
  if (String(roleDoc.branchId) !== String(bid)) {
    res.status(403).json({ status: 'fail', message: 'Forbidden' });
    return false;
  }
  return true;
}

/** Branch admins may update/delete only non-global roles belonging to their branch. */
async function assertBranchRoleMutate(req, roleDoc, res) {
  if (isSuperAdmin(req.user)) return true;
  if (!isBranchAdmin(req.user)) {
    res.status(403).json({ status: 'fail', message: 'Forbidden' });
    return false;
  }
  const bid = await resolveBranchIdForNonSuperAdmin(req);
  if (!bid) {
    res.status(403).json({ status: 'fail', message: 'Branch not assigned' });
    return false;
  }
  if (!roleDoc.branchId || String(roleDoc.branchId) !== String(bid)) {
    res.status(403).json({
      status: 'fail',
      message: 'You can only manage roles created for your branch',
    });
    return false;
  }
  return true;
}

const getCatalog = async (req, res) => {
  try {
    const data = Array.isArray(permissionCatalog) ? [...permissionCatalog] : [];
    const menuMatrix = Array.isArray(menuPermissionCatalog.MENU_ROWS)
      ? [...menuPermissionCatalog.MENU_ROWS]
      : [];
    return res.status(200).json({ status: 'ok', data, menuMatrix });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

const getRoles = async (req, res) => {
  try {
    const filter = await rolesFilterForUser(req);
    const rows = await Role.find(filter).sort({ isSystem: -1, name: 1 }).lean().exec();
    const data = filterRolesHiddenFromBranchAdmin(req, rows);
    return res.status(200).json({ status: 'ok', data });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).lean().exec();
    if (!role) {
      return res.status(404).json({ status: 'fail', message: 'Role not found' });
    }
    if (!isSuperAdmin(req.user) && isElevatedRoleHiddenFromBranchViewer(role)) {
      return res.status(404).json({ status: 'fail', message: 'Role not found' });
    }
    if (!(await assertBranchRoleRead(req, role, res))) return;
    return res.status(200).json({ status: 'ok', data: role });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

const createRole = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const key = normalizeKey(req.body.key);
    const description = String(req.body.description || '').trim();
    const permissions = sanitizePermissions(req.body.permissions);

    if (!name) {
      return res.status(400).json({ status: 'fail', message: 'Role name is required' });
    }

    if (!isSuperAdmin(req.user) && isElevatedRoleHiddenFromBranchViewer({ key, name })) {
      return res.status(403).json({
        status: 'fail',
        message: 'This role name or key is reserved for super admin only',
      });
    }

    if (!key || !/^[a-z0-9_-]+$/.test(key)) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Valid role key is required (lowercase letters, numbers, - and _)' });
    }

    let branchId = null;
    if (isSuperAdmin(req.user)) {
      branchId = parseOptionalBranchObjectId(req.body.branchId);
    } else {
      branchId = await resolveBranchIdForNonSuperAdmin(req);
    }

    const created = await Role.create({
      name,
      key,
      description,
      permissions,
      isSystem: false,
      branchId,
    });

    await propagateTabsToUsersMatchingRole(created);

    return res.status(200).json({ status: 'ok', data: created });
  } catch (err) {
    const message =
      err?.code === 11000 ? 'A role with this key already exists' : err.message;
    return res.status(500).json({ status: 'fail', message });
  }
};

const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ status: 'fail', message: 'Role not found' });
    }
    if (role.isSystem) {
      return res.status(400).json({ status: 'fail', message: 'System roles cannot be edited' });
    }
    if (!isSuperAdmin(req.user) && isElevatedRoleHiddenFromBranchViewer(role)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
    if (!(await assertBranchRoleMutate(req, role, res))) return;

    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const permissions = sanitizePermissions(req.body.permissions);

    if (!name) {
      return res.status(400).json({ status: 'fail', message: 'Role name is required' });
    }

    if (!isSuperAdmin(req.user) && isElevatedRoleHiddenFromBranchViewer({ key: role.key, name })) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
    role.name = name;
    role.description = description;
    role.permissions = permissions;
    if (isSuperAdmin(req.user) && req.body.branchId !== undefined) {
      role.branchId = parseOptionalBranchObjectId(req.body.branchId);
    }
    await role.save();

    await propagateTabsToUsersMatchingRole(role);

    return res.status(200).json({ status: 'ok', data: role });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ status: 'fail', message: 'Role not found' });
    }
    if (role.isSystem) {
      return res.status(400).json({ status: 'fail', message: 'System roles cannot be deleted' });
    }
    if (!isSuperAdmin(req.user) && isElevatedRoleHiddenFromBranchViewer(role)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
    if (!(await assertBranchRoleMutate(req, role, res))) return;

    await Role.deleteOne({ _id: role._id });
    return res.status(200).json({ status: 'ok', message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

module.exports = {
  getCatalog,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
