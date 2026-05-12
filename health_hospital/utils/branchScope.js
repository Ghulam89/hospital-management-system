const mongoose = require('mongoose');
const Department = require('../models/departmentModel');
const Room = require('../models/roomModel');
const Ward = require('../models/wardModel');
const Patient = require('../models/patientModel');
const AdmitPatient = require('../models/admitPatientModel');
const User = require('../models/userModel');
const Visit = require('../models/visitModel');
const Invoice = require('../models/invoiceModel');
const Appointment = require('../models/appointmentModel');
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
    const bidStr = pickValidBranchOidString(req.query.branchId);
    if (bidStr) {
      const oid = new mongoose.Types.ObjectId(bidStr);
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

/** First valid Mongo ObjectId from duplicated query (`branchId=a&branchId=b`), comma string, or `{ _id }`. */
function pickValidBranchOidString(raw) {
  if (raw == null || raw === '') return null;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const inner = pickValidBranchOidString(item);
      if (inner) return inner;
    }
    return null;
  }
  if (typeof raw === 'object' && raw._id != null) {
    return pickValidBranchOidString(raw._id);
  }
  const full = String(raw).trim();
  if (!full) return null;
  for (const token of full.split(',').map((x) => x.trim()).filter(Boolean)) {
    if (mongoose.Types.ObjectId.isValid(token)) return token;
  }
  return null;
}

function idInList(id, list) {
  if (!id || !list || !list.length) return false;
  const s = String(id);
  return list.some((x) => String(x) === s);
}

/**
 * Compare branch ids safely even when Mongoose has populated `branchId`
 * into a full document like `{ _id, name, ... }`.
 */
function normalizeBranchComparableId(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && value !== null && '_id' in value && value._id != null) {
    return String(value._id);
  }
  return String(value);
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

/** Branch used for writes (inbound stock, etc.): staff branch, or superadmin ?branchId / body.branchId. */
async function resolveWriteBranchOid(req) {
  const fromStaff = await resolveBranchIdForNonSuperAdmin(req);
  if (fromStaff) return fromStaff;
  if (!req?.user) return null;
  const role = normalizeRole(req.user.role);
  if (role === 'superadmin' || role === 'super admin') {
    const bidStr =
      pickValidBranchOidString(req.query?.branchId) ?? pickValidBranchOidString(req.body?.branchId);
    if (bidStr) {
      return new mongoose.Types.ObjectId(bidStr);
    }
  }
  return null;
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
    const bidStr = pickValidBranchOidString(req.query.branchId);
    if (bidStr) {
      q.branchId = bidStr;
    }
    return Object.keys(q).length ? q : null;
  }

  const branchId = await resolveBranchIdForNonSuperAdmin(req);
  if (branchId) {
    return { branchId: toObjectIdMaybe(branchId) };
  }
  return null;
}

/**
 * Pharmacy suppliers / manufacturers / categories & expense categories — one hospital-wide list.
 * Any logged-in user can read; writes are enforced with requireSuperAdmin on routes.
 */
async function mergeCatalogPreferenceFilter(req) {
  if (!req?.user) {
    return { _id: null };
  }
  return {};
}

/** @deprecated name — same as mergeBranchScopedQuery (kept for patient helpers). */
const mergePatientListBranchFilter = mergeBranchScopedQuery;

/**
 * Apply branchId to list queries (appointments, tokens).
 * Non–super-admin without resolved branch → empty list (no global leak).
 * Superadmin without ?branchId → no branchId on query (all branches).
 * @returns {'ok'|'empty'}
 */
async function applyStrictBranchListFilter(req, query) {
  if (!req?.user) return 'ok';

  const role = normalizeRole(req.user.role);
  const isSuper = role === 'superadmin' || role === 'super admin';

  const scoped = await mergeBranchScopedQuery(req);
  if (scoped && scoped.branchId) {
    query.branchId = scoped.branchId;
    return 'ok';
  }

  if (!isSuper) {
    return 'empty';
  }

  return 'ok';
}

function assignBranchIdForCreate(req, payload) {
  const out = payload && typeof payload === 'object' ? { ...payload } : {};
  if (!req?.user) return out;
  const role = normalizeRole(req.user.role);
  if (role === 'superadmin' || role === 'super admin') {
    const bidStr =
      pickValidBranchOidString(req.query?.branchId) ?? pickValidBranchOidString(req.body?.branchId);
    if (
      bidStr &&
      (out.branchId === undefined || out.branchId === null || out.branchId === '')
    ) {
      out.branchId = new mongoose.Types.ObjectId(bidStr);
    }
    return out;
  }
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
  // Legacy invoices created before branch scoping often have no branchId — do not hide them
  // from branch staff (otherwise edit page 404s while the invoice still appears in lists/reports).
  if (branchIdOnDoc == null || branchIdOnDoc === '') {
    return true;
  }
  return normalizeBranchComparableId(branchIdOnDoc) === normalizeBranchComparableId(q.branchId);
}

/**
 * Hospital-wide pharmacy/expense catalog rows may use branchId null.
 * Any authenticated staff may use them in-context (e.g. supplier ledger); scoped rows match the user's branch.
 */
async function catalogEntityVisibleForStaff(req, branchIdOnDoc) {
  if (!req?.user) return false;
  const role = normalizeRole(req.user.role);
  if (role === 'superadmin' || role === 'super admin') return true;
  if (branchIdOnDoc == null || branchIdOnDoc === '') return true;
  const branchId = await resolveBranchIdForNonSuperAdmin(req);
  if (!branchId) return false;
  return normalizeBranchComparableId(branchIdOnDoc) === normalizeBranchComparableId(branchId);
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

  const [fromVisits, fromInvoices, fromLegacyPatients, fromAppointments] =
    await Promise.all([
      Visit.distinct('patientId', { branchId }),
      Invoice.distinct('patientId', { branchId }),
      Patient.distinct('_id', { branchId }),
      Appointment.distinct('patientId', {
        branchId,
        patientId: { $exists: true, $ne: null },
      }),
    ]);

  const set = new Set();
  for (const id of fromVisits) if (id) set.add(String(id));
  for (const id of fromInvoices) if (id) set.add(String(id));
  for (const id of fromLegacyPatients) if (id) set.add(String(id));
  for (const id of fromAppointments) if (id) set.add(String(id));

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

  const [v, inv, legacy, apt] = await Promise.all([
    Visit.findOne({ patientId: pid, branchId: bid }).select('_id').lean(),
    Invoice.findOne({ patientId: pid, branchId: bid }).select('_id').lean(),
    Patient.findOne({ _id: pid, branchId: bid }).select('_id').lean(),
    Appointment.findOne({ patientId: pid, branchId: bid }).select('_id').lean(),
  ]);

  return !!(v || inv || legacy || apt);
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
  pickValidBranchOidString,
  getScopedDepartmentIds,
  getScopedRoomIds,
  getScopedWardIds,
  idInList,
  mergeBranchScopedQuery,
  mergeCatalogPreferenceFilter,
  mergePatientListBranchFilter,
  applyStrictBranchListFilter,
  resolveWriteBranchOid,
  resolveBranchIdForNonSuperAdmin,
  loadBranchIdFromUserDoc,
  assignBranchIdForCreate,
  branchDocumentVisible,
  catalogEntityVisibleForStaff,
  getScopedPatientIds,
  applyPatientIdScopeToQuery,
  patientVisibleForRequest,
  getScopedAdmitPatientIds,
};
