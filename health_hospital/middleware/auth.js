const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/** Lowercase slug; collapses `super_admin` / `super-admin` / `Super Admin` → `superadmin` for branch scoping. */
const normalizeRole = (role) => {
  const s = String(role || '')
    .toLowerCase()
    .replace(/\s+/g, '');
  if (s.replace(/[_-]/g, '') === 'superadmin') return 'superadmin';
  return s;
};

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const tokenFromHeader = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = tokenFromHeader || req.headers['x-access-token'] || req.query.token;

    if (!token) {
      return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, 'health');
    const user = await User.findById(decoded?.id).lean();

    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
    }

    req.user = user;
    req.userRole = normalizeRole(user.role);
    next();
  } catch (err) {
    return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
  }
};

const requireRole = (...roles) => {
  const allowed = roles.map(normalizeRole);
  return (req, res, next) => {
    const role = req.userRole || normalizeRole(req.user?.role);
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
    next();
  };
};

/** Synced catalogs & restricted mutations: only super admin (adjust message per route if needed). */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
  }
  const role = req.userRole || normalizeRole(req.user?.role);
  if (role !== 'superadmin' && role !== 'super admin') {
    return res.status(403).json({
      status: 'fail',
      message: 'Only super admin can perform this action',
    });
  }
  next();
};

/** Same verification as auth, but continues without req.user if there is no / invalid token. */
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const tokenFromHeader = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = tokenFromHeader || req.headers['x-access-token'] || req.query.token;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, 'health');
    const user = await User.findById(decoded?.id).lean();

    if (user) {
      req.user = user;
      req.userRole = normalizeRole(user.role);
    }
    next();
  } catch {
    next();
  }
};

/** Tabs from user doc (array, legacy object map, or JSON string). */
function coercePermissionTabs(user) {
  if (!user?.tabs) return [];
  const raw = user.tabs;
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (raw && typeof raw === 'object') {
    return Object.values(raw)
      .map((t) => String(t).trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      /* ignore */
    }
  }
  return [];
}

/** True if user has mp.{menuId}.{action} or superadmin / legacy full admin without granular mp.* */
function hasMpPermission(user, menuId, action) {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === 'superadmin' || role === 'super admin') return true;
  const tabs = new Set(coercePermissionTabs(user));
  if (tabs.has(`mp.${menuId}.${action}`)) return true;
  const legacyFull = ['administrator', 'admin'].includes(role);
  const usesGranular = [...tabs].some((t) => t.startsWith('mp.'));
  if (legacyFull && !usesGranular) return true;
  return false;
}

const requireMpPermission = (menuId, action) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
  }
  if (!hasMpPermission(req.user, menuId, action)) {
    return res.status(403).json({
      status: 'fail',
      message: 'You do not have permission for this action',
    });
  }
  next();
};

module.exports = {
  auth,
  requireRole,
  requireSuperAdmin,
  normalizeRole,
  optionalAuth,
  coercePermissionTabs,
  hasMpPermission,
  requireMpPermission,
};
