const mongoose = require("mongoose");
const Patient = require("../models/patientModel");
const Branch = require("../models/branchModel");
const Invoice = require("../models/invoiceModel");
const PharmPos = require("../models/pharmPosModel");
const Visit = require("../models/visitModel");
const Token = require("../models/tokenModel");
const Appointment = require("../models/appointmentModel");
const { normalizeRole } = require("../middleware/auth");
const {
  normalizeCnic,
  normalizePhone,
  cnicQueryVariants,
  phoneQueryVariants,
} = require("../utils/patientIdentity");
const {
  mergePatientListBranchFilter,
  mergeBranchScopedQuery,
  patientVisibleForRequest,
  resolveBranchIdForNonSuperAdmin,
  getScopedPatientIds,
} = require("../utils/branchScope");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Order patient ids: latest Visit at branch first, then patients with no visit at branch (by Patient.createdAt). */
async function orderPatientIdsByBranchActivity(patientIds, branchId) {
  if (!patientIds || !patientIds.length || !branchId) return [...patientIds];
  const bid = mongoose.Types.ObjectId.isValid(String(branchId))
    ? new mongoose.Types.ObjectId(String(branchId))
    : branchId;
  const ids = patientIds.map((id) =>
    id instanceof mongoose.Types.ObjectId
      ? id
      : new mongoose.Types.ObjectId(String(id))
  );
  const vo = await Visit.aggregate([
    { $match: { branchId: bid, patientId: { $in: ids } } },
    { $group: { _id: "$patientId", lastVisit: { $max: "$createdAt" } } },
    { $sort: { lastVisit: -1 } },
  ]);
  const seen = new Set(vo.map((v) => String(v._id)));
  const tailIds = ids.filter((id) => !seen.has(String(id)));
  let tailSorted = tailIds;
  if (tailIds.length) {
    const tailDocs = await Patient.find({ _id: { $in: tailIds } })
      .select("createdAt")
      .lean();
    const orderMap = new Map(tailDocs.map((d) => [String(d._id), d]));
    tailSorted = [...tailIds].sort(
      (a, b) =>
        new Date(orderMap.get(String(b))?.createdAt || 0) -
        new Date(orderMap.get(String(a))?.createdAt || 0)
    );
  }
  return [...vo.map((v) => v._id), ...tailSorted];
}

/**
 * Branch labels for patient list: union of Visit + Invoice branchIds, plus legacy Patient.branchId.
 */
async function buildVisitMetaForPatientIds(patientIds, leanPatientDocs = []) {
  const defaultMeta = {
    distinctBranchCount: 0,
    visitCount: 0,
    isMultiBranch: false,
    branchNames: [],
  };

  const idList = (patientIds || []).filter(Boolean);
  if (!idList.length) {
    return { metaMap: new Map(), defaultMeta };
  }

  const [visitAgg, invoiceAgg] = await Promise.all([
    Visit.aggregate([
      { $match: { patientId: { $in: idList } } },
      {
        $group: {
          _id: "$patientId",
          branches: { $addToSet: "$branchId" },
          visitCount: { $sum: 1 },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { patientId: { $in: idList } } },
      {
        $group: {
          _id: "$patientId",
          branches: { $addToSet: "$branchId" },
        },
      },
    ]),
  ]);

  const byPatient = new Map();
  for (const row of visitAgg) {
    const pid = String(row._id);
    byPatient.set(pid, {
      branches: new Set(
        (row.branches || []).filter(Boolean).map((x) => String(x))
      ),
      visitCount: row.visitCount || 0,
    });
  }
  for (const row of invoiceAgg) {
    const pid = String(row._id);
    if (!byPatient.has(pid)) {
      byPatient.set(pid, { branches: new Set(), visitCount: 0 });
    }
    const e = byPatient.get(pid);
    for (const b of row.branches || []) {
      if (b) e.branches.add(String(b));
    }
  }

  for (const p of leanPatientDocs || []) {
    if (!p || !p._id || !p.branchId) continue;
    const pid = String(p._id);
    const bstr = String(p.branchId);
    if (!mongoose.Types.ObjectId.isValid(bstr)) continue;
    if (!byPatient.has(pid)) {
      byPatient.set(pid, { branches: new Set(), visitCount: 0 });
    }
    byPatient.get(pid).branches.add(bstr);
  }

  const allBranchIdStrs = new Set();
  for (const [, v] of byPatient) {
    for (const b of v.branches) allBranchIdStrs.add(b);
  }

  let nameById = new Map();
  if (allBranchIdStrs.size) {
    const oids = [...allBranchIdStrs]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const branchDocs = await Branch.find({ _id: { $in: oids } })
      .select("name")
      .lean();
    nameById = new Map(
      branchDocs.map((d) => [String(d._id), (d.name || "").trim()])
    );
  }

  const metaMap = new Map();
  for (const [pid, v] of byPatient) {
    const branchIdList = [...v.branches].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    const names = branchIdList
      .map((id) => nameById.get(String(id)))
      .filter((n) => n && n.length);
    const uniqNames = [...new Set(names)];
    metaMap.set(pid, {
      distinctBranchCount: branchIdList.length,
      visitCount: v.visitCount,
      isMultiBranch: branchIdList.length > 1,
      branchNames: uniqNames,
    });
  }

  return { metaMap, defaultMeta };
}

async function maybeOpenRegistrationVisit(req, patientId) {
  const role = normalizeRole(req.user?.role);
  let branchId = null;

  if (role === "superadmin" || role === "super admin") {
    const raw = req.body?.branchId || req.query?.branchId;
    if (raw != null && raw !== "" && mongoose.Types.ObjectId.isValid(String(raw))) {
      branchId = new mongoose.Types.ObjectId(String(raw));
    }
  } else {
    branchId = await resolveBranchIdForNonSuperAdmin(req);
  }

  if (!branchId) return;

  const exists = await Visit.findOne({
    patientId,
    branchId,
  })
    .select("_id")
    .lean();
  if (exists) return;

  await Visit.create({
    patientId,
    branchId,
    visitType: "OPD",
    status: "open",
    createdById: req.user?._id,
  });
}

// 1. Create patient (global identity — no branchId on Patient)
const addpatient = async (req, res) => {
  try {
    const cnicNorm = normalizeCnic(req.body.cnic);
    const phoneNorm = normalizePhone(req.body.phone);

    if (!cnicNorm || cnicNorm.length !== 13) {
      return res.status(400).json({
        status: "fail",
        message: "CNIC is required and must be 13 digits.",
      });
    }

    const checkcnic = await Patient.findOne({ cnicNormalized: cnicNorm });
    if (checkcnic) {
      return res.status(409).json({
        status: "fail",
        message: "CNIC already registered. Search the patient and start a visit instead of creating a duplicate.",
        data: { existingPatientId: checkcnic._id },
      });
    }

    if (phoneNorm) {
      const checkPhone = await Patient.findOne({ phoneNormalized: phoneNorm });
      if (checkPhone) {
        return res.status(409).json({
          status: "fail",
          message: "This phone is already registered.",
          data: { existingPatientId: checkPhone._id },
        });
      }
    }

    const image =
      req.files && req.files.image !== undefined
        ? req.files.image[0].filename
        : "";

    let payload = { ...req.body, image };
    delete payload.branchId;
    delete payload.branchHistory;
    delete payload.allowDuplicatePhone;

    const patient = await Patient.create(payload);
    await maybeOpenRegistrationVisit(req, patient._id);

    return res.status(200).json({ status: "ok", data: patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getpatients = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      gender,
      mr,
      name,
      phone,
      cnic,
      phoneOwner,
      dob,
      status,
      fromDate,
      toDate,
      excludeId,
      exact
    } = req.query;

    const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit)) : 20;
    const query = {};

    // Basic search filter
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { cnic: { $regex: search, $options: "i" } },
        { mr: { $regex: search, $options: "i" } },
      ];
    }

    // Individual field filters based on schema (MR: exact by default so e.g. 585622 matches one record)
    if (mr && String(mr).trim() !== "") {
      const m = String(mr).trim();
      const exactMr =
        String(req.query.exactMr || "true").toLowerCase() !== "false";
      if (exactMr) {
        query.mr = m;
      } else {
        query.mr = { $regex: escapeRegex(m), $options: "i" };
      }
    }

    if (name && name.trim() !== '') {
      query.name = { $regex: name, $options: "i" };
    }

    if (phone && phone.trim() !== '') {
      if (String(exact).toLowerCase() === 'true') {
        const pn = normalizePhone(phone);
        if (pn) query.phoneNormalized = pn;
        else query.phone = phone;
      } else {
        query.phone = { $regex: phone, $options: "i" };
      }
    }

    if (cnic && cnic.trim() !== '') {
      const cn = normalizeCnic(cnic);
      if (cn.length >= 5) {
        query.$or = [{ cnicNormalized: cn }, { cnic: { $regex: cnic, $options: "i" } }];
      } else {
        query.cnic = { $regex: cnic, $options: "i" };
      }
    }

    if (phoneOwner && phoneOwner.trim() !== '') {
      query.phoneOwner = { $regex: phoneOwner, $options: "i" };
    }

    if (gender && gender.trim() !== '') {
      query.gender = gender;
    }

    if (dob && dob.trim() !== '') {
      query.dob = dob;
    }

    if (excludeId && String(excludeId).trim() !== '') {
      query._id = { $ne: excludeId };
    }

    if (status && status.trim() !== '') {
      query.status = status;
    }

    // Date range filter for createdAt (timestamps)
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate && fromDate.trim() !== '') {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate && toDate.trim() !== '') {
        query.createdAt.$lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }

    const branchF = await mergePatientListBranchFilter(req);
    if (branchF && branchF.branchId) {
      const scopedIds = await getScopedPatientIds(req);
      if (!scopedIds.length) {
        return res.status(200).json({
          status: "ok",
          data: [],
          search,
          page,
          count: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          limit,
        });
      }
      query._id = { $in: scopedIds };
    }

    const crossBranchOnly =
      String(req.query.crossBranchOnly || "").toLowerCase() === "true";
    if (crossBranchOnly) {
      const multiPatients = await Visit.aggregate([
        {
          $match: {
            patientId: { $exists: true, $ne: null },
            branchId: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$patientId",
            branches: { $addToSet: "$branchId" },
          },
        },
        {
          $match: { $expr: { $gt: [{ $size: "$branches" }, 1] } },
        },
      ]);
      const multiIds = multiPatients.map((x) => x._id).filter(Boolean);
      if (!multiIds.length) {
        return res.status(200).json({
          status: "ok",
          data: [],
          search,
          page,
          count: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          limit,
        });
      }
      const multiSet = new Set(multiIds.map((id) => String(id)));
      if (query._id && query._id.$in) {
        const next = query._id.$in.filter((id) => multiSet.has(String(id)));
        query._id = { $in: next };
        if (!next.length) {
          return res.status(200).json({
            status: "ok",
            data: [],
            search,
            page,
            count: 0,
            totalPages: 0,
            currentPage: parseInt(page),
            limit,
          });
        }
      } else {
        query._id = { $in: multiIds };
      }
    }

    console.log('Patient query:', JSON.stringify(query, null, 2));

    const count = await Patient.countDocuments(query);

    const pageNum = parseInt(page, 10) || 1;
    const scopedArr =
      query._id && query._id.$in && Array.isArray(query._id.$in) ? query._id.$in : [];
    const maxSortIds = 5000;
    const hasListSearch =
      (search && String(search).trim() !== "") ||
      (mr && String(mr).trim() !== "") ||
      (name && String(name).trim() !== "") ||
      (phone && String(phone).trim() !== "") ||
      (cnic && String(cnic).trim() !== "");
    const useBranchActivitySort =
      !hasListSearch &&
      branchF &&
      branchF.branchId &&
      scopedArr.length > 0 &&
      scopedArr.length <= maxSortIds &&
      String(req.query.sort || "branchActivity") !== "createdAt";

    let patients = [];
    if (useBranchActivitySort) {
      const orderedIds = await orderPatientIdsByBranchActivity(
        scopedArr,
        branchF.branchId
      );
      const skipN = (pageNum - 1) * limit;
      const pageIds = orderedIds.slice(skipN, skipN + limit);
      if (!pageIds.length) {
        patients = [];
      } else {
        const raw = await Patient.find({ _id: { $in: pageIds } })
          .populate(["doctorId"])
          .lean();
        const orderMap = new Map(pageIds.map((id, i) => [String(id), i]));
        patients = raw.sort(
          (a, b) =>
            (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0)
        );
      }
    } else {
      patients = await Patient.find(query)
        .sort({ createdAt: -1 })
        .populate(["doctorId"])
        .limit(limit)
        .skip((pageNum - 1) * limit)
        .lean();
    }

    const pids = patients.map((p) => p._id).filter(Boolean);
    const { metaMap: visitMetaByPatient, defaultMeta: defaultVisitMeta } =
      await buildVisitMetaForPatientIds(pids, patients);

    let data = patients.map((p) => ({
      ...p,
      visitMeta: visitMetaByPatient.get(String(p._id)) || defaultVisitMeta,
      _rowSource: "branchList",
      notInThisBranch: false,
    }));

    const includeIdentity =
      String(req.query.includeIdentityMatches || "").toLowerCase() === "true";
    const cnQ = cnic ? normalizeCnic(cnic) : "";
    const pnQ = phone ? normalizePhone(phone) : "";
    const mrTrim =
      mr && String(mr).trim() !== "" ? String(mr).trim() : "";

    if (includeIdentity && (cnQ.length >= 5 || pnQ || mrTrim)) {
      const orGlob = [];
      if (cnQ.length >= 5) orGlob.push({ cnicNormalized: cnQ });
      if (pnQ) orGlob.push({ phoneNormalized: pnQ });
      if (mrTrim) orGlob.push({ mr: mrTrim });
      const extras = await Patient.find({ $or: orGlob })
        .limit(12)
        .populate(["doctorId"])
        .lean();
      const pageIdSet = new Set(data.map((d) => String(d._id)));
      let scopedSet = null;
      if (branchF && branchF.branchId) {
        const s = await getScopedPatientIds(req);
        scopedSet = s && s.length ? new Set(s.map(String)) : new Set();
      }
      const pidsEx = extras.map((e) => e._id).filter(Boolean);
      const { metaMap: metaExMap } = await buildVisitMetaForPatientIds(
        pidsEx,
        extras
      );
      for (const ex of extras) {
        if (pageIdSet.has(String(ex._id))) continue;
        const notInThisBranch = !!(scopedSet && !scopedSet.has(String(ex._id)));
        data.push({
          ...ex,
          visitMeta: metaExMap.get(String(ex._id)) || defaultVisitMeta,
          _rowSource: "identityLookup",
          notInThisBranch,
        });
      }
    }

    if (mrTrim) {
      const exact = (p) => String(p.mr || "").trim() === mrTrim;
      data.sort((a, b) => {
        const score = (exact(b) ? 1 : 0) - (exact(a) ? 1 : 0);
        if (score !== 0) return score;
        const aOb = a.notInThisBranch ? 1 : 0;
        const bOb = b.notInThisBranch ? 1 : 0;
        if (aOb !== bOb) return bOb - aOb;
        return 0;
      });
    } else {
      const cnicQNorm = cnic && String(cnic).trim() ? normalizeCnic(String(cnic)) : "";
      if (cnicQNorm.length === 13) {
        const exactC = (p) =>
          String(p.cnicNormalized || normalizeCnic(p.cnic || "")) === cnicQNorm;
        data.sort((a, b) => {
          const score = (exactC(b) ? 1 : 0) - (exactC(a) ? 1 : 0);
          if (score !== 0) return score;
          const aOb = a.notInThisBranch ? 1 : 0;
          const bOb = b.notInThisBranch ? 1 : 0;
          if (aOb !== bOb) return bOb - aOb;
          return 0;
        });
      }
    }

    console.log('Found patients:', data.length);

    return res.status(200).json({
      status: "ok",
      data,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      limit
    });
  } catch (err) {
    console.error('Patient fetch error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * For registration: check if CNIC already exists, and if that patient is on-file at the current branch scope.
 */
const checkCnicForBranch = async (req, res) => {
  try {
    const raw = String(req.query.cnic || "").trim();
    if (!raw) {
      return res.status(400).json({ status: "fail", message: "cnic is required" });
    }
    const cn = normalizeCnic(raw);
    if (cn.length !== 13) {
      return res.status(200).json({
        status: "ok",
        exists: false,
        inThisBranch: false,
        unscoped: false,
        reason: "incomplete",
      });
    }
    const p = await Patient.findOne({ cnicNormalized: cn })
      .select("mr name phone cnic cnicNormalized")
      .lean();
    if (!p) {
      return res
        .status(200)
        .json({ status: "ok", exists: false, inThisBranch: false, unscoped: false });
    }
    const scoped = await getScopedPatientIds(req);
    const unscoped = scoped == null;
    const inThisBranch = unscoped
      ? true
      : scoped.some((id) => String(id) === String(p._id));

    return res.status(200).json({
      status: "ok",
      exists: true,
      inThisBranch,
      unscoped,
      patient: {
        _id: p._id,
        mr: p.mr,
        name: p.name,
        phone: p.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "fail", error: err.message });
  }
};

// 3. Get patient by id
const getpatientById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!(await patientVisibleForRequest(req, id))) {
      return res.status(404).json({ status: "fail", message: "Patient not found" });
    }
    const patient = await Patient.findById(id).populate(['doctorId']);
    return res.status(200).json({ status: "ok", data: patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Global patient lookup (CNIC / phone / free text). Does not filter by branch —
 * used to reuse identity before opening a visit at the current branch.
 */
const searchPatients = async (req, res) => {
  try {
    const { q, cnic, phone, limit = "20" } = req.query;
    const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const or = [];

    if (cnic && String(cnic).trim()) {
      const cn = normalizeCnic(cnic);
      if (cn) {
        or.push({ cnicNormalized: cn });
        cnicQueryVariants(cnic).forEach((v) => {
          if (v && v !== cn) or.push({ cnic: v });
        });
      } else {
        or.push({ cnic: { $regex: String(cnic).trim(), $options: "i" } });
      }
    }

    if (phone && String(phone).trim()) {
      const pn = normalizePhone(phone);
      if (pn) {
        or.push({ phoneNormalized: pn });
        or.push({ phone: { $regex: pn, $options: "i" } });
      } else {
        or.push({ phone: { $regex: String(phone).trim(), $options: "i" } });
      }
    }

    if (q && String(q).trim()) {
      const s = String(q).trim();
      or.push(
        { name: { $regex: s, $options: "i" } },
        { mr: { $regex: s, $options: "i" } },
      );
      const qn = normalizePhone(s);
      if (qn) or.push({ phoneNormalized: qn });
      const qc = normalizeCnic(s);
      if (qc.length >= 5) or.push({ cnicNormalized: qc });
    }

    if (!or.length) {
      return res.status(400).json({
        status: "fail",
        message: "Provide at least one of: q, cnic, phone",
      });
    }

    const data = await Patient.find({ $or: or })
      .sort({ updatedAt: -1 })
      .limit(lim)
      .populate("doctorId")
      .lean();

    return res.status(200).json({ status: "ok", data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Unified timeline for a patient. Branch users see only their branch slice;
 * superadmin without ?branchId sees all branches.
 */
const getPatientFullHistory = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ status: "fail", message: "Invalid patient id" });
    }
    if (!(await patientVisibleForRequest(req, id))) {
      return res.status(404).json({ status: "fail", message: "Patient not found" });
    }

    const patient = await Patient.findById(id).populate("doctorId").lean();
    if (!patient) {
      return res.status(404).json({ status: "fail", message: "Patient not found" });
    }

    const mergeQ = await mergePatientListBranchFilter(req);
    const branchId = mergeQ && mergeQ.branchId;

    const invQ = { patientId: id };
    const posQ = { patientId: id };
    const visQ = { patientId: id };
    if (branchId) {
      invQ.branchId = branchId;
      posQ.branchId = branchId;
      visQ.branchId = branchId;
    }

    const [visits, invoices, posSales] = await Promise.all([
      Visit.find(visQ).sort({ createdAt: -1 }).lean(),
      Invoice.find(invQ).sort({ createdAt: -1 }).populate("doctorId").lean(),
      PharmPos.find(posQ).sort({ createdAt: -1 }).lean(),
    ]);

    let tokenQuery = { patientId: id };
    if (branchId) {
      const tokIds = invoices.map((i) => i.tokenId).filter(Boolean);
      const or = [{ branchId }];
      if (tokIds.length) or.push({ _id: { $in: tokIds } });
      tokenQuery = { patientId: id, $or: or };
    }

    const tokens = await Token.find(tokenQuery).sort({ createdAt: -1 }).populate("doctorId").lean();
    const appointments = await Appointment.find({ patientId: id })
      .sort({ appointmentDate: -1 })
      .lean();

    return res.status(200).json({
      status: "ok",
      data: {
        patient,
        scope: branchId ? { branchId: String(branchId) } : null,
        visits,
        invoices,
        tokens,
        pharmacyPos: posSales,
        appointments,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update patient
const updatepatient = async (req, res) => {
  try {
    let id = req.params.id;
    if (!(await patientVisibleForRequest(req, id))) {
      return res.status(404).json({ status: "fail", message: "Patient not found" });
    }
    const phoneNorm = normalizePhone(req.body.phone);
    if (phoneNorm) {
      const dupPhone = await Patient.findOne({
        phoneNormalized: phoneNorm,
        _id: { $ne: id },
      });
      if (dupPhone) {
        return res.status(409).json({
          status: "fail",
          message: "This phone is already registered.",
          data: { existingPatientId: dupPhone._id },
        });
      }
    }
    let getImage = await Patient.findById(id);
    const image =
      !req.files || req.files.image === undefined
        ? getImage.image
        : req.files.image[0].filename;

    const patch = { ...req.body, image };
    delete patch.branchHistory;
    delete patch.allowDuplicatePhone;

    delete patch.branchId;
    const updatedpatient = await Patient.findByIdAndUpdate(
      id,
      patch,
      { new: true }
    ).populate(["doctorId"]);
    return res.status(200).json({ status: "ok", data: updatedpatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete patient
const deletepatient = async (req, res) => {
  try {
    const id = req.params.id;
    if (!(await patientVisibleForRequest(req, id))) {
      return res.status(404).json({ status: "fail", message: "Patient not found" });
    }
    await Patient.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "patient deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Customer Ledger – invoices + POS transactions and payments with running balance
const getCustomerLedger = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    console.log(`[getCustomerLedger] Request for patientId: ${patientId}, from: ${from}, to: ${to}`);

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      console.log(`[getCustomerLedger] Patient not found: ${patientId}`);
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }
    if (!(await patientVisibleForRequest(req, patientId))) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const entries = [];

    const invoices = await Invoice.find({ patientId })
      .sort({ createdAt: 1 })
      .lean();
    
    console.log(`[getCustomerLedger] Found ${invoices.length} invoices for patientId: ${patientId}`);
    for (const inv of invoices) {
      const date = inv.createdAt;
      console.log(`[getCustomerLedger] Processing invoice ${inv._id}, date: ${date}, from: ${from}, to: ${to}`);
      if (from && date < from) {
        console.log(`[getCustomerLedger] Skipping invoice ${inv._id} - date ${date} < from ${from}`);
        continue;
      }
      if (to && date > to) {
        console.log(`[getCustomerLedger] Skipping invoice ${inv._id} - date ${date} > to ${to}`);
        continue;
      }
      entries.push({
        date,
        description: `Invoice ${inv.invoiceNo || inv._id}`,
        reference: inv.invoiceNo,
        type: "invoice",
        debit: Number(inv.totalBill) || 0,
        credit: 0,
        source: "invoice",
        invoiceId: inv._id,
      });
      if (inv.payment && Array.isArray(inv.payment)) {
        console.log(`[getCustomerLedger] Processing ${inv.payment.length} payments for invoice ${inv._id}`);
        for (const p of inv.payment) {
          const payDate = p.payDate ? new Date(p.payDate) : date;
          if (from && payDate < from) continue;
          if (to && payDate > to) continue;
          entries.push({
            date: payDate,
            description: `Payment (Invoice ${inv.invoiceNo || inv._id})`,
            reference: inv.invoiceNo,
            type: "payment",
            debit: 0,
            credit: Number(p.paid) || 0,
            source: "invoice",
            invoiceId: inv._id,
            paymentId: p?._id,
            method: p?.method || "",
            payDate,
            paid: Number(p?.paid) || 0,
            referenceText: p?.reference || "",
            chequeNo: p?.chequeNo || "",
            bankName: p?.bankName || "",
            chequeDate: p?.chequeDate ? new Date(p.chequeDate) : null,
            notes: p?.notes || "",
          });
        }
      }
    }

    const posList = await PharmPos.find(posQ)
      .sort({ createdAt: 1 })
      .lean();
    
    console.log(`[getCustomerLedger] Found ${posList.length} POS transactions for patientId: ${patientId}`);
    
    for (const pos of posList) {
      const total = Number(pos.paid) + Number(pos.due || 0);
      const date = pos.createdAt;
      console.log(`[getCustomerLedger] Processing POS ${pos._id}, date: ${date}, paid: ${pos.paid}, due: ${pos.due}, total: ${total}`);
      if (from && date < from) {
        console.log(`[getCustomerLedger] Skipping POS ${pos._id} - date ${date} < from ${from}`);
        continue;
      }
      if (to && date > to) {
        console.log(`[getCustomerLedger] Skipping POS ${pos._id} - date ${date} > to ${to}`);
        continue;
      }
      entries.push({
        date,
        description: `POS ${pos.invoiceNumber || pos._id}`,
        reference: pos.invoiceNumber,
        type: "pos",
        debit: total,
        credit: 0,
        source: "pos",
        posId: pos._id,
      });
      if (pos.payment && Array.isArray(pos.payment)) {
        console.log(`[getCustomerLedger] Processing ${pos.payment.length} payments for POS ${pos._id}`);
        for (const p of pos.payment) {
          const payDate = p.payDate ? new Date(p.payDate) : date;
          if (from && payDate < from) continue;
          if (to && payDate > to) continue;
          entries.push({
            date: payDate,
            description: `Payment (POS ${pos.invoiceNumber || pos._id})`,
            reference: pos.invoiceNumber,
            type: "payment",
            debit: 0,
            credit: Number(p.paid) || 0,
            source: "pos",
            posId: pos._id,
            paymentId: p?._id,
            method: p?.method || "",
            payDate,
            paid: Number(p?.paid) || 0,
            referenceText: p?.reference || "",
            chequeNo: p?.chequeNo || "",
            bankName: p?.bankName || "",
            chequeDate: p?.chequeDate ? new Date(p.chequeDate) : null,
            notes: p?.notes || "",
          });
        }
      }
    }

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const entriesWithBalance = entries.map((e) => {
      balance += (e.debit || 0) - (e.credit || 0);
      return { ...e, balance };
    });

    const closingBalance = entriesWithBalance.length
      ? entriesWithBalance[entriesWithBalance.length - 1].balance
      : 0;

    console.log(`[getCustomerLedger] Final result: ${entriesWithBalance.length} entries, closing balance: ${closingBalance}`);

    return res.status(200).json({
      status: "ok",
      data: {
        patient: { _id: patient._id, name: patient.name, mr: patient.mr, phone: patient.phone },
        entries: entriesWithBalance,
        openingBalance: 0,
        closingBalance,
      },
    });
  } catch (err) {
    console.error("Customer ledger error:", err);
    res.status(500).json({ error: err.message });
  }
};

const addCustomerLedgerPayment = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }
    if (!(await patientVisibleForRequest(req, patientId))) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const incoming = Array.isArray(req.body?.payments) ? req.body.payments : [];
    const cleanedPayments = incoming
      .map((p) => ({
        method: p?.method || '',
        payDate: p?.payDate ? new Date(p.payDate) : new Date(),
        paid: Number(p?.paid) || 0,
        reference: p?.reference || '',
        chequeNo: p?.chequeNo || '',
        bankName: p?.bankName || '',
        chequeDate: p?.chequeDate ? new Date(p.chequeDate) : undefined,
        notes: p?.notes || '',
      }))
      .filter((p) => p.paid > 0);

    if (cleanedPayments.length === 0) {
      return res.status(400).json({ status: "error", message: "No valid payments provided" });
    }

    const branchScopePay = await mergeBranchScopedQuery(req);
    const invQPay = { patientId };
    if (branchScopePay && branchScopePay.branchId) {
      invQPay.branchId = branchScopePay.branchId;
    }
    const invoices = await Invoice.find(invQPay).sort({ createdAt: 1 });

    let invoicesTouched = 0;
    const allocations = [];

    for (const payment of cleanedPayments) {
      let remaining = Number(payment.paid) || 0;
      if (remaining <= 0) continue;

      for (const invoice of invoices) {
        if (remaining <= 0) break;

        const totalBill = Number(invoice.totalBill) || 0;
        const alreadyPaid = (invoice.payment || []).reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
        const due = totalBill - alreadyPaid;
        if (due <= 0) continue;

        const applied = Math.min(due, remaining);
        invoice.payment = Array.isArray(invoice.payment) ? invoice.payment : [];
        invoice.payment.push({
          method: payment.method,
          payDate: payment.payDate,
          paid: applied,
          reference: payment.reference,
          chequeNo: payment.chequeNo,
          bankName: payment.bankName,
          chequeDate: payment.chequeDate,
          notes: payment.notes,
        });

        const newTotalPaid = alreadyPaid + applied;
        invoice.totalPay = newTotalPaid;
        invoice.duePay = totalBill - newTotalPaid;

        await invoice.save();
        invoicesTouched += 1;
        allocations.push({
          invoiceId: invoice._id,
          invoiceNo: invoice.invoiceNo,
          paid: applied,
        });

        remaining -= applied;
      }

      if (remaining > 0) {
        allocations.push({
          invoiceId: null,
          invoiceNo: null,
          paid: 0,
          unallocated: remaining,
        });
      }
    }

    return res.status(200).json({
      status: "ok",
      data: {
        patient: { _id: patient._id, name: patient.name, mr: patient.mr, phone: patient.phone },
        invoicesTouched,
        allocations,
      },
    });
  } catch (err) {
    console.error("Customer ledger payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

const addCustomerInvoiceLedgerPayment = async (req, res) => {
  try {
    const { patientId, invoiceId } = req.params;

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }
    if (!(await patientVisibleForRequest(req, patientId))) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ status: "error", message: "Invoice not found" });
    }

    if (String(invoice.patientId) !== String(patientId)) {
      return res.status(400).json({ status: "error", message: "Invoice does not belong to this patient" });
    }

    const branchScopeInv = await mergeBranchScopedQuery(req);
    if (branchScopeInv && branchScopeInv.branchId) {
      if (
        !invoice.branchId ||
        String(invoice.branchId) !== String(branchScopeInv.branchId)
      ) {
        return res.status(404).json({ status: "error", message: "Invoice not found" });
      }
    }

    const incoming = Array.isArray(req.body?.payments) ? req.body.payments : [];
    const cleanedPayments = incoming
      .map((p) => ({
        method: p?.method || "",
        payDate: p?.payDate ? new Date(p.payDate) : new Date(),
        paid: Number(p?.paid) || 0,
        reference: p?.reference || "",
        chequeNo: p?.chequeNo || "",
        bankName: p?.bankName || "",
        chequeDate: p?.chequeDate ? new Date(p.chequeDate) : undefined,
        notes: p?.notes || "",
      }))
      .filter((p) => p.paid > 0);

    if (cleanedPayments.length === 0) {
      return res.status(400).json({ status: "error", message: "No valid payments provided" });
    }

    const totalBill = Number(invoice.totalBill) || 0;
    const alreadyPaid = (invoice.payment || []).reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    const due = totalBill - alreadyPaid;

    const incomingTotal = cleanedPayments.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);
    if (incomingTotal > due) {
      return res.status(400).json({
        status: "error",
        message: `Payment exceeds due for this invoice. Due: ${due}, Payment: ${incomingTotal}`,
      });
    }

    invoice.payment = Array.isArray(invoice.payment) ? invoice.payment : [];
    invoice.payment.push(...cleanedPayments);

    const totalPaid = (invoice.payment || []).reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    invoice.totalPay = totalPaid;
    invoice.duePay = totalBill - totalPaid;

    const updated = await invoice.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Customer invoice ledger payment error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const updateCustomerLedgerPayment = async (req, res) => {
  try {
    const { patientId, invoiceId, paymentId } = req.params;

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }
    if (!(await patientVisibleForRequest(req, patientId))) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ status: "error", message: "Invoice not found" });
    }

    if (String(invoice.patientId) !== String(patientId)) {
      return res.status(400).json({ status: "error", message: "Invoice does not belong to this patient" });
    }

    const branchScopeUpd = await mergeBranchScopedQuery(req);
    if (branchScopeUpd && branchScopeUpd.branchId) {
      if (
        !invoice.branchId ||
        String(invoice.branchId) !== String(branchScopeUpd.branchId)
      ) {
        return res.status(404).json({ status: "error", message: "Invoice not found" });
      }
    }

    const p = invoice.payment?.id(paymentId);
    if (!p) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    const incoming = req.body?.payment || {};

    const paid = incoming?.paid === undefined ? p.paid : Number(incoming.paid) || 0;
    if (paid < 0) {
      return res.status(400).json({ status: "error", message: "Invalid payment amount" });
    }

    if (incoming.method !== undefined) p.method = incoming.method || "";
    if (incoming.payDate !== undefined) p.payDate = incoming.payDate ? new Date(incoming.payDate) : new Date();
    if (incoming.reference !== undefined) p.reference = incoming.reference || "";
    if (incoming.chequeNo !== undefined) p.chequeNo = incoming.chequeNo || "";
    if (incoming.bankName !== undefined) p.bankName = incoming.bankName || "";
    if (incoming.chequeDate !== undefined) p.chequeDate = incoming.chequeDate ? new Date(incoming.chequeDate) : undefined;
    if (incoming.notes !== undefined) p.notes = incoming.notes || "";
    p.paid = paid;

    const totalPaid = (invoice.payment || []).reduce((sum, x) => sum + (Number(x?.paid) || 0), 0);
    const totalBill = Number(invoice.totalBill) || 0;
    invoice.totalPay = totalPaid;
    invoice.duePay = totalBill - totalPaid;

    const updated = await invoice.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Update customer ledger payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

const deleteCustomerLedgerPayment = async (req, res) => {
  try {
    const { patientId, invoiceId, paymentId } = req.params;

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }
    if (!(await patientVisibleForRequest(req, patientId))) {
      return res.status(404).json({ status: "error", message: "Patient not found" });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ status: "error", message: "Invoice not found" });
    }

    if (String(invoice.patientId) !== String(patientId)) {
      return res.status(400).json({ status: "error", message: "Invoice does not belong to this patient" });
    }

    const branchScopeDel = await mergeBranchScopedQuery(req);
    if (branchScopeDel && branchScopeDel.branchId) {
      if (
        !invoice.branchId ||
        String(invoice.branchId) !== String(branchScopeDel.branchId)
      ) {
        return res.status(404).json({ status: "error", message: "Invoice not found" });
      }
    }

    const p = invoice.payment?.id(paymentId);
    if (!p) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    p.deleteOne();

    const totalPaid = (invoice.payment || []).reduce((sum, x) => sum + (Number(x?.paid) || 0), 0);
    const totalBill = Number(invoice.totalBill) || 0;
    invoice.totalPay = totalPaid;
    invoice.duePay = totalBill - totalPaid;

    const updated = await invoice.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Delete customer ledger payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpatient,
  getpatients,
  getpatientById,
  searchPatients,
  checkCnicForBranch,
  getPatientFullHistory,
  getCustomerLedger,
  addCustomerLedgerPayment,
  addCustomerInvoiceLedgerPayment,
  updateCustomerLedgerPayment,
  deleteCustomerLedgerPayment,
  updatepatient,
  deletepatient,
};
