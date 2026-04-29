const mongoose = require('mongoose');
const Role = require('../models/roleModel');
const permissionCatalog = require('../utils/permissionCatalog');
const menuPermissionCatalog = require('../utils/menuPermissionCatalog');
const { normalizeRole } = require('../middleware/auth');

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
    .replace(/\s+/g, '_');

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

/** Branch admins see global templates (branchId null) + roles owned by their branch. Superadmin sees all. */
function rolesFilterForUser(user) {
  if (isSuperAdmin(user)) return {};
  const bid = user?.branchId;
  if (!bid) return { branchId: null };
  return { $or: [{ branchId: null }, { branchId: bid }] };
}

function assertBranchRoleRead(req, roleDoc, res) {
  if (isSuperAdmin(req.user)) return true;
  const bid = req.user?.branchId;
  const r = normalizeRole(req.user?.role);
  if (r !== 'administrator' && r !== 'admin') return true;
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
function assertBranchRoleMutate(req, roleDoc, res) {
  if (isSuperAdmin(req.user)) return true;
  const bid = req.user?.branchId;
  const r = normalizeRole(req.user?.role);
  if (r !== 'administrator' && r !== 'admin') {
    res.status(403).json({ status: 'fail', message: 'Forbidden' });
    return false;
  }
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
    const filter = rolesFilterForUser(req.user);
    const data = await Role.find(filter).sort({ isSystem: -1, name: 1 }).lean().exec();
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
    if (!assertBranchRoleRead(req, role, res)) return;
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
    if (!key || !/^[a-z0-9_-]+$/.test(key)) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Valid role key is required (lowercase letters, numbers, - and _)' });
    }

    let branchId = req.user?.branchId || null;
    if (isSuperAdmin(req.user)) {
      branchId = parseOptionalBranchObjectId(req.body.branchId);
    }

    const created = await Role.create({
      name,
      key,
      description,
      permissions,
      isSystem: false,
      branchId,
    });

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
    if (!assertBranchRoleMutate(req, role, res)) return;

    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const permissions = sanitizePermissions(req.body.permissions);

    if (!name) {
      return res.status(400).json({ status: 'fail', message: 'Role name is required' });
    }

    role.name = name;
    role.description = description;
    role.permissions = permissions;
    if (isSuperAdmin(req.user) && req.body.branchId !== undefined) {
      role.branchId = parseOptionalBranchObjectId(req.body.branchId);
    }
    await role.save();

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
    if (!assertBranchRoleMutate(req, role, res)) return;

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
