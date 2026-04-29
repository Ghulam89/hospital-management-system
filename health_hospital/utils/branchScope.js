const mongoose = require('mongoose');
const Department = require('../models/departmentModel');
const Room = require('../models/roomModel');
const Ward = require('../models/wardModel');
const Patient = require('../models/patientModel');
const AdmitPatient = require('../models/admitPatientModel');
const User = require('../models/userModel');
const Visit = require('../models/visitModel');
const Invoice = require('../models/invoiceModel');
const { normalizeRole } = require('../middleware/auth');

/** Departments tagged to a branch OR global (synced catalog — super admin maintains). */
function departmentVisibilityOrFilter(branchObjectId) {
  const bid = branchObjectId;
  return {
    $or: [{ branchId: bid }, { branchId: null }, { branchId: { $exists: false } }],
  };
}

/**
 * Returns department ObjectIds visible for this request, or null when no branch scoping applies.
 * - No authenticated user: null (no extra filter; legacy behaviour).
 * - Superadmin without ?branchId: null (all departments).
 * - Superadmin with ?branchId: global departments + departments for that branch (synced view).
 * - User with branchId: global departments + departments for their branch.
 */
async function getScopedDepartmentIds(req) {
  if (!req.user) return null;

  const role = normalizeRole(req.user.role);
  if (role === 'superadmin' || role === 'super admin') {
    const bid = req.query.branchId;
    if (bid && mongoose.Types.ObjectId.isValid(String(bid))) {
      const oid = new mongoose.Types.ObjectId(String(bid));
      const rows = await Department.find(departmentVisibilityOrFilter(oid)).select('_id').lean();
      return rows.map((r) => r._id);
    }
    return null;
  }

  const ub = await resolveBranchIdForNonSuperAdmin(req);
  if (!ub) return null;

  const rows = await Department.find(departmentVisibilityOrFilter(ub)).select('_id').lean();
  return rows.map((r) => r._id);
}

async function getScopedRoomIds(req) {
  const deptIds = await getScopedDepartmentIds(req);
  if (deptIds === null) return null;
  if (deptIds.length === 0) return [];
  const rooms = await Room.find({ departmentId: { $in: deptIds } }).select('_id').lean();
  return rooms.map((r) => r._id);
}

async function getScopedWardIds(req) {
  const deptIds = await getScopedDepartmentIds(req);
  if (deptIds === null) return null;
  if (deptIds.length === 0) return [];
  const wards = await Ward.find({ departmentId: { $in: deptIds } }).select('_id').lean();
  return wards.map((w) => w._id);
}

function idInList(id, list) {
  if (!id || !list || !list.length) return false;
  const s = String(id);
  return list.some((x) => String(x) === s);
}

function toObjectIdMaybe(value) {
  if (value == null || value === '') return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'object' && value._id) {
    const inner = value._id;
    const s = String(inner);
    return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : inner;
  }
  const s = String(value);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : value;
}

/** Resolve branch from User.branchId, or from User.departmentId → Department.branchId (JWT may omit branchId). */
async function loadBranchIdFromUserDoc(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) return null;
  const row = await User.findById(userId).select('branchId departmentId').lean();
  if (!row) return null;
  if (row.branchId) return row.branchId;
  if (row.departmentId) {
    const dept = await Department.findById(row.departmentId).select('branchId').lean();
    if (dept?.branchId) return dept.branchId;
  }
  return null;
}

/** Branch id for non–super-admin: JWT branchId, else DB user (optional ?adminId when it equals logged-in user). */
async function resolveBranchIdForNonSuperAdmin(req) {
  if (!req?.user) return null;
  const role = normalizeRole(req.user.role);
  if (role === 'superadmin' || role === 'super admin') return null;

  let branchId = req.user.branchId || null;
  if (branchId && typeof branchId === 'object' && !(branchId instanceof mongoose.Types.ObjectId)) {
    branchId = branchId._id || null;
  }
  if (!branchId) {
    const qAdmin = req.query?.adminId;
    const adminIdMatchesSelf =
      qAdmin &&
      mongoose.Types.ObjectId.isValid(String(qAdmin)) &&
      String(qAdmin) === String(req.user._id);
    const userIdToResolve = adminIdMatchesSelf ? qAdmin : req.user._id;
    branchId = await loadBranchIdFromUserDoc(userIdToResolve);
  }
  return toObjectIdMaybe(branchId);
}

/**
 * Mongo { branchId } filter for any collection that stores branchId.
 * null = no branch restriction (unauthenticated or superadmin without ?branchId).
 */
async function mergeBranchScopedQuery(req) {
  if (!req.user) return null;

  const role = normalizeRole(req.user.role);
  if (role === 'superadmin' || role === 'super admin') {
    const q = {};
    if (req.query.branchId && mongoose.Types.ObjectId.isValid(String(req.query.branchId))) {
      q.branchId = req.query.branchId;
    }
    return Object.keys(q).length ? q : null;
  }

  const branchId = await resolveBranchIdForNonSuperAdmin(req);
  if (branchId) {
    return { branchId: toObjectIdMaybe(branchId) };
  }
  return null;
}

/** @deprecated name — same as mergeBranchScopedQuery (kept for patient helpers). */
const mergePatientListBranchFilter = mergeBranchScopedQuery;

function assignBranchIdForCreate(req, payload) {
  const out = payload && typeof payload === 'object' ? { ...payload } : {};
  if (!req?.user) return out;
  const role = normalizeRole(req.user.role);
  if (role === 'superadmin' || role === 'super admin') return out;
  if (req.user.branchId && (out.branchId === undefined || out.branchId === null || out.branchId === '')) {
    out.branchId = req.user.branchId;
  }
  return out;
}

async function branchDocumentVisible(req, branchIdOnDoc) {
  if (req?.user) {
    const role = normalizeRole(req.user.role);
    if (role === 'superadmin' || role === 'super admin') {
      return true;
    }
  }
  const q = await mergeBranchScopedQuery(req);
  if (q === null) return true;
  if (branchIdOnDoc == null || branchIdOnDoc === '') {
    return false;
  }
  return String(branchIdOnDoc) === String(q.branchId);
}

/**
 * Patient _ids visible for this request; null = no restriction (superadmin / unscoped).
 * Uses Visits + Invoices + legacy Patient.branchId so global patients appear once they interact with a branch.
 */
async function getScopedPatientIds(req) {
  const f = await mergePatientListBranchFilter(req);
  if (f === null) return null;
  const branchId = f.branchId;
  if (!branchId) return [];

  const [fromVisits, fromInvoices, fromLegacyPatients] = await Promise.all([
    Visit.distinct('patientId', { branchId }),
    Invoice.distinct('patientId', { branchId }),
    Patient.distinct('_id', { branchId }),
  ]);

  const set = new Set();
  for (const id of fromVisits) if (id) set.add(String(id));
  for (const id of fromInvoices) if (id) set.add(String(id));
  for (const id of fromLegacyPatients) if (id) set.add(String(id));

  return [...set]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Intersects query.patientId with scoped patients.
 * @returns {'ok'|'empty'}
 */
async function applyPatientIdScopeToQuery(req, query) {
  const scopedIds = await getScopedPatientIds(req);
  if (scopedIds === null) return 'ok';
  if (scopedIds.length === 0) return 'empty';

  const scopeSet = new Set(scopedIds.map(String));

  if (!query.patientId) {
    query.patientId = { $in: scopedIds };
    return 'ok';
  }

  const pid = query.patientId;
  if (pid && typeof pid === 'object' && Array.isArray(pid.$in)) {
    const next = pid.$in.filter((id) => scopeSet.has(String(id)));
    if (next.length === 0) return 'empty';
    query.patientId = { $in: next };
    return 'ok';
  }

  if (scopeSet.has(String(pid))) return 'ok';
  return 'empty';
}

/**
 * May this request access this patient's record?
 * Superadmin: yes. Branch user: only if patient has activity (visit/invoice) at that branch or legacy Patient.branchId.
 */
async function patientVisibleForRequest(req, patientId) {
  if (!patientId || !mongoose.Types.ObjectId.isValid(String(patientId))) return false;
  if (!req.user) return false;

  const role = normalizeRole(req.user.role);
  if (role === 'superadmin' || role === 'super admin') return true;

  const f = await mergePatientListBranchFilter(req);
  if (f === null || !f.branchId) return false;

  const bid = f.branchId;
  const pid = new mongoose.Types.ObjectId(String(patientId));

  const [v, inv, legacy] = await Promise.all([
    Visit.findOne({ patientId: pid, branchId: bid }).select('_id').lean(),
    Invoice.findOne({ patientId: pid, branchId: bid }).select('_id').lean(),
    Patient.findOne({ _id: pid, branchId: bid }).select('_id').lean(),
  ]);

  return !!(v || inv || legacy);
}

/** AdmitPatient _ids whose linked patient is visible for this request. */
async function getScopedAdmitPatientIds(req) {
  const pids = await getScopedPatientIds(req);
  if (pids === null) return null;
  if (pids.length === 0) return [];
  const admits = await AdmitPatient.find({ patientId: { $in: pids } }).select('_id').lean();
  return admits.map((a) => a._id);
}

module.exports = {
  getScopedDepartmentIds,
  getScopedRoomIds,
  getScopedWardIds,
  idInList,
  mergeBranchScopedQuery,
  mergePatientListBranchFilter,
  resolveBranchIdForNonSuperAdmin,
  assignBranchIdForCreate,
  branchDocumentVisible,
  getScopedPatientIds,
  applyPatientIdScopeToQuery,
  patientVisibleForRequest,
  getScopedAdmitPatientIds,
};
