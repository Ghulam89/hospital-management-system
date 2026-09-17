const mongoose = require("mongoose");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { normalizeRole } = require("../middleware/auth");
const {
  findRoleDocForLogin,
  refreshUserTabsFromRole,
} = require("../utils/syncUserTabsFromRole");
const { loadBranchIdFromUserDoc, pickValidBranchOidString } = require("../utils/branchScope");

const isSuperAdminRole = (role) => normalizeRole(role) === "superadmin";
const isBranchAdminRole = (role) => {
  const r = normalizeRole(role);
  return (
    r === "administrator" ||
    r === "admin" ||
    r === "branchadmin" ||
    r === "branch_admin" ||
    r.startsWith("administrator_") ||
    r.startsWith("admin_")
  );
};

const isDoctorRoleKey = (role) => {
  const r = normalizeRole(role);
  return r === "doctor" || r.startsWith("doctor_");
};

function normalizeDoctorPhone(value) {
  if (value == null || value === "") return "";
  let s = String(value).trim();
  if (s.startsWith("+")) s = s.slice(1);
  return s.replace(/\D/g, "");
}

function doctorIdentityKey(doc) {
  const pmdc = String(doc.PMDC || "").trim().toLowerCase();
  if (pmdc) return `pmdc:${pmdc}`;
  const email = String(doc.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  const phone = normalizeDoctorPhone(doc.phone);
  if (phone.length >= 10) return `phone:${phone}`;
  return `id:${doc._id}`;
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function branchRefKey(id) {
  if (id == null || id === "") return "";
  if (typeof id === "object" && id._id != null) return String(id._id).trim();
  return String(id).trim();
}

function bodyHasExplicitBranchAssignment(body) {
  if (!body || typeof body !== "object") return false;
  if (body.branchIds != null && body.branchIds !== "") return true;
  if (typeof body.branchIdsCsv === "string" && body.branchIdsCsv.trim()) return true;
  if (body.branchId != null && body.branchId !== "") return true;
  return false;
}

function parseBranchIdsFromBody(body, fallbackBranchId) {
  let raw = body?.branchIds;
  if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) raw = parsed;
      } catch {
        raw = trimmed.split(",");
      }
    } else {
      raw = trimmed.split(",");
    }
  }
  const csvRaw = body?.branchIdsCsv;
  const fromCsv =
    typeof csvRaw === "string" && csvRaw.trim()
      ? csvRaw.split(",").map((s) => s.trim())
      : [];
  const fromArray = Array.isArray(raw) ? raw : [];
  const ids = [
    ...fromArray,
    ...fromCsv,
    body?.branchId,
    fallbackBranchId,
  ]
    .map((id) => branchRefKey(id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  return [...new Set(ids)];
}

function cleanDoctorProfilePayload(payload) {
  const next = stripBranchFieldsFromPayload({ ...payload });
  delete next.branchId;
  if (next.password === undefined || next.password === null || next.password === "") {
    delete next.password;
  }
  return next;
}

function doctorBaseDocForClone(existingUser) {
  const base = existingUser.toObject ? existingUser.toObject() : { ...existingUser };
  delete base._id;
  delete base.__v;
  delete base.createdAt;
  delete base.updatedAt;
  return base;
}

async function findDoctorSiblings(doc) {
  if (!doc) return [];
  const filters = [];
  const pmdc = String(doc.PMDC || "").trim();
  if (pmdc) filters.push({ PMDC: pmdc });
  const email = String(doc.email || "").trim();
  if (email) {
    filters.push({ email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") } });
  }
  const phone = String(doc.phone || "").trim();
  if (phone) filters.push({ phone });
  if (!filters.length) return [doc];
  return User.find({ role: /^doctor(_.*)?$/i, $or: filters }).lean();
}

async function doctorConflictInBranch({
  email,
  phone,
  branchId,
  excludeUserIds = [],
}) {
  const branchStr = String(branchId || "");
  if (!branchStr) return null;
  const base = { branchId: branchStr, role: /^doctor(_.*)?$/i };
  const exclude = (Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds])
    .filter(Boolean)
    .map(String);
  if (exclude.length) base._id = { $nin: exclude };

  if (email) {
    const emailHit = await User.findOne({
      ...base,
      email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
    });
    if (emailHit) return "Email already registered for this branch";
  }
  if (phone) {
    const phoneHit = await User.findOne({ ...base, phone: String(phone).trim() });
    if (phoneHit) return "Phone already registered for this branch";
  }
  return null;
}

function stripBranchFieldsFromPayload(payload) {
  const next = { ...payload };
  delete next.branchIds;
  return next;
}

/** Query `isActive`: omit/true → active (+ legacy missing); false → inactive; all → no filter. */
function parseIsActiveListFilter(req) {
  const raw = String(req?.query?.isActive ?? "true").trim().toLowerCase();
  if (raw === "all") return null;
  if (raw === "false" || raw === "0") return { isActive: false };
  return {
    $or: [{ isActive: true }, { isActive: { $exists: false } }, { isActive: null }],
  };
}

function normalizeIsActiveFlag(value) {
  if (value === undefined) return undefined;
  return !(value === false || value === "false" || value === 0 || value === "0");
}

async function buildScopedDoctorQuery(req) {
  const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const andParts = [{ role: /^doctor(_.*)?$/i }];

  const actor = req.user;
  const actorRole = normalizeRole(actor?.role);

  let actorBranchId = actor?.branchId;
  if (!isSuperAdminRole(actorRole) && !actorBranchId && actor?._id) {
    actorBranchId = await loadBranchIdFromUserDoc(actor._id);
  }

  if (isSuperAdminRole(actorRole)) {
    const allBranches =
      String(req.query.allBranches || "").trim() === "1" ||
      String(req.query.allBranches || "").toLowerCase() === "true";
    const bidStr = allBranches ? null : pickValidBranchOidString(req.query.branchId);
    if (bidStr) {
      andParts.push({ branchId: bidStr });
    }
  } else if (actorBranchId) {
    andParts.push({ branchId: actorBranchId });
  } else if (!isSuperAdminRole(actorRole)) {
    return null;
  }

  const search = String(req.query.search || "").trim();
  if (search) {
    andParts.push({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { PMDC: { $regex: search, $options: "i" } },
      ],
    });
  }

  const activeF = parseIsActiveListFilter(req);
  if (activeF) andParts.push(activeF);

  return andParts.length === 1 ? andParts[0] : { $and: andParts };
}

const isWithinActorBranch = (actor, targetBranchId) => {
  if (!actor) return false;
  if (isSuperAdminRole(actor.role)) return true;
  return String(actor.branchId || "") === String(targetBranchId || "");
};

const canManageTargetUser = async (actor, targetUser) => {
  if (!actor || !targetUser) return false;
  if (isSuperAdminRole(actor.role)) return true;
  if (!isBranchAdminRole(actor.role)) return false;

  let actorBr = actor.branchId;
  if (!actorBr && actor._id) {
    actorBr = await loadBranchIdFromUserDoc(actor._id);
  }
  let targetBr = targetUser.branchId;
  if (!targetBr && targetUser._id) {
    targetBr = await loadBranchIdFromUserDoc(targetUser._id);
  }

  if (!isWithinActorBranch({ ...actor, branchId: actorBr }, targetBr)) return false;
  return !isSuperAdminRole(targetUser.role);
};

/**
 * Custom / template Role docs define matrix access; `tabs` must mirror Role.permissions.
 * Branch-scoped roles (branchId set) may only be assigned to users in that branch.
 */
async function syncTabsFromRoleDoc(actor, payload, existingUser) {
  const rawRole =
    payload.role !== undefined && payload.role !== null
      ? payload.role
      : existingUser?.role;
  if (!String(rawRole || "").trim()) return { ok: true, payload };

  let effectiveBranchId = payload.branchId;
  if (existingUser && (effectiveBranchId === undefined || effectiveBranchId === null)) {
    effectiveBranchId = existingUser.branchId;
  }
  if (
    (effectiveBranchId === undefined ||
      effectiveBranchId === null ||
      effectiveBranchId === '') &&
    existingUser?._id
  ) {
    effectiveBranchId = await loadBranchIdFromUserDoc(existingUser._id);
  }

  const actorRole = normalizeRole(actor?.role);
  if (isBranchAdminRole(actorRole) && !isSuperAdminRole(actorRole)) {
    effectiveBranchId = actor.branchId;
    payload.branchId = actor.branchId;
  }

  const roleDoc = await findRoleDocForLogin(rawRole, effectiveBranchId);
  if (!roleDoc) {
    // Never trust client-sent tabs when Role catalog has no matching key —
    // stale mp.* from the form would keep wrong sidebar access after a role change.
    if (existingUser) {
      delete payload.tabs;
    } else if (payload.tabs === undefined) {
      payload.tabs = [];
    }
    return { ok: true, payload };
  }

  if (!isSuperAdminRole(actor.role)) {
    if (roleDoc.branchId) {
      const rb = String(roleDoc.branchId);
      const tb = effectiveBranchId ? String(effectiveBranchId) : "";
      if (!tb || rb !== tb) {
        return {
          ok: false,
          message:
            "This role belongs to another branch and can only be assigned to users in that branch",
        };
      }
    }
  }

  payload.tabs = Array.isArray(roleDoc.permissions) ? [...roleDoc.permissions] : [];
  return { ok: true, payload };
}


// 1. Create user
const adduser = async (req, res) => {
  try {
    const actor = req.user;
    const actorRole = normalizeRole(actor?.role);
    const requestedRole = normalizeRole(req.body.role);
    const isDoctor = isDoctorRoleKey(requestedRole);

    let actorBr = actor?.branchId;
    if (!actorBr && actor?._id) {
      actorBr = await loadBranchIdFromUserDoc(actor._id);
    }

    if (isBranchAdminRole(actorRole)) {
      if (requestedRole === "superadmin") {
        return res
          .status(403)
          .json({ status: "fail", message: "Branch admin cannot create superadmin" });
      }
      if (!actorBr) {
        return res
          .status(400)
          .json({ status: "fail", message: "Branch admin has no assigned branch" });
      }
    }

    if (
      isBranchAdminRole(requestedRole) &&
      !isSuperAdminRole(requestedRole) &&
      isSuperAdminRole(actorRole)
    ) {
      const b = req.body.branchId;
      if (!b || !mongoose.Types.ObjectId.isValid(String(b))) {
        return res.status(400).json({
          status: "fail",
          message: "branchId is required when creating admin / administrator users",
        });
      }
    }

    if (
      isBranchAdminRole(requestedRole) &&
      !isSuperAdminRole(requestedRole) &&
      !req.body.branchId &&
      !actorBr
    ) {
      return res
        .status(400)
        .json({ status: "fail", message: "branchId is required for administrator" });
    }

    const branchIds = isDoctor
      ? parseBranchIdsFromBody(
          req.body,
          isBranchAdminRole(actorRole) && !isSuperAdminRole(actorRole) ? actorBr : null,
        )
      : parseBranchIdsFromBody(req.body, actorBr).slice(0, 1);

    if (isDoctor && branchIds.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Select at least one branch for the doctor",
      });
    }

    if (!isDoctor) {
      const checkPhone = await User.findOne({ phone: req.body.phone });
      const checkemail = await User.findOne({ email: req.body.email });
      if (req.body.email && checkemail) {
        return res
          .status(500)
          .json({ status: "fail", message: "Email already exist!" });
      }
      if (req.body.phone && checkPhone) {
        return res
          .status(500)
          .json({ status: "fail", message: "Phone already exist!" });
      }
    } else {
      for (const bid of branchIds) {
        const conflict = await doctorConflictInBranch({
          email: req.body.email,
          phone: req.body.phone,
          branchId: bid,
        });
        if (conflict) {
          return res.status(500).json({ status: "fail", message: conflict });
        }
      }
    }

    const basePayload = stripBranchFieldsFromPayload({ ...req.body });
    if (!isDoctor) {
      if (isBranchAdminRole(actorRole) && !isSuperAdminRole(actorRole)) {
        basePayload.branchId = actorBr;
      } else if (!basePayload.branchId && actorBr) {
        basePayload.branchId = actorBr;
      }
    }

    const createdUsers = [];
    const targets = isDoctor ? branchIds : [basePayload.branchId || branchIds[0]].filter(Boolean);

    for (const bid of targets) {
      const payload = isDoctor ? { ...basePayload, branchId: bid } : basePayload;
      const sync = await syncTabsFromRoleDoc(actor, payload, null);
      if (!sync.ok) {
        return res.status(403).json({ status: "fail", message: sync.message });
      }
      const user = await User.create(sync.payload);
      createdUsers.push(user);
    }

    const primary = createdUsers[0];
    const token = jwt.sign({ id: primary?._id }, "health", { expiresIn: "30d" });
    return res.status(200).json({
      status: "ok",
      data: primary,
      created: createdUsers,
      branchCount: createdUsers.length,
      token,
      message:
        createdUsers.length > 1
          ? `Doctor registered in ${createdUsers.length} branches`
          : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all users
const getusers = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    /** Use $and so role + search $or never overwrite each other; superadmin branch filter can include unassigned users. */
    const andParts = [];

    const actor = req.user;
    const actorRole = normalizeRole(actor?.role);

    if (req.query.roles) {
      const arr = String(req.query.roles || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length === 1) {
        andParts.push({ role: new RegExp(`^${escapeRegex(arr[0])}$`, 'i') });
      } else if (arr.length > 1) {
        andParts.push({
          role: { $in: arr.map((k) => new RegExp(`^${escapeRegex(k)}$`, 'i')) },
        });
      }
    } else if (req.query.role) {
      const r = String(req.query.role || '').trim();
      if (r) {
        const rl = r.toLowerCase();
        if (rl === "nurse") {
          andParts.push({ role: /^nurse(_.*)?$/i });
        } else if (rl === "pharmacist") {
          andParts.push({ role: /^pharmacist(_.*)?$/i });
        } else if (rl === "quality_control_manager") {
          andParts.push({ role: /^quality_control_manager(_.*)?$/i });
        } else if (rl === "accountant") {
          andParts.push({ role: /^accountant(_.*)?$/i });
        } else if (rl === "staff") {
          andParts.push({
            role: /^(staff|reception|receptionist)(_.*)?$|.*reception.*/i,
          });
        } else if (rl === "doctor") {
          andParts.push({ role: /^doctor(_.*)?$/i });
        } else if (rl === "administrator" || rl === "admin") {
          andParts.push({ role: /^(administrator|admin)(_.*)?$/i });
        } else {
          andParts.push({ role: new RegExp(`^${escapeRegex(r)}$`, 'i') });
        }
      }
    }

    let actorBranchId = actor?.branchId;
    if (!isSuperAdminRole(actorRole) && !actorBranchId && actor?._id) {
      actorBranchId = await loadBranchIdFromUserDoc(actor._id);
    }

    if (isSuperAdminRole(actorRole)) {
      const bidStr = pickValidBranchOidString(req.query.branchId);
      if (bidStr) {
        andParts.push({
          $or: [
            { branchId: bidStr },
            { branchId: null },
            { branchId: { $exists: false } },
          ],
        });
      }
    } else if (actorBranchId) {
      andParts.push({ branchId: actorBranchId });
    } else if (!isSuperAdminRole(actorRole)) {
      return res.status(200).json({
        status: "ok",
        data: [],
        search,
        page,
        count: 0,
        totalPages: 0,
        currentPage: page,
        limit,
      });
    }

    if (search) {
      andParts.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      });
    }

    const activeF = parseIsActiveListFilter(req);
    if (activeF) andParts.push(activeF);

    const query =
      andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0] : { $and: andParts };

    const users = await User.find(query).sort({createdAt:-1})
      .populate(['departmentId','branchId'])
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(query);

    return res.status(200).json({
      status: "ok",
      data: users,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDoctorsGrouped = async (req, res) => {
  try {
    const query = await buildScopedDoctorQuery(req);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    if (!query) {
      return res.status(200).json({
        status: "ok",
        data: [],
        count: 0,
        totalPages: 0,
        page,
        limit,
      });
    }

    const doctors = await User.find(query)
      .populate("branchId", "name code")
      .sort({ name: 1, createdAt: -1 })
      .lean();

    const map = new Map();
    for (const d of doctors) {
      const key = doctorIdentityKey(d);
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: d.name || "",
          email: d.email || "",
          phone: d.phone || "",
          PMDC: d.PMDC || "",
          isActive: d.isActive !== false,
          branches: [],
          latestUpdatedAt: d.updatedAt || null,
        });
      }
      const group = map.get(key);
      if (!group.name && d.name) group.name = d.name;
      if (!group.email && d.email) group.email = d.email;
      if (!group.phone && d.phone) group.phone = d.phone;
      if (!group.PMDC && d.PMDC) group.PMDC = d.PMDC;
      if (d.isActive === false) group.isActive = false;

      const bid = d.branchId?._id || d.branchId || null;
      group.branches.push({
        userId: String(d._id),
        branchId: bid ? String(bid) : "",
        branchName: d.branchId?.name || d.branchId?.code || "Unassigned",
        updatedAt: d.updatedAt || null,
        isActive: d.isActive !== false,
      });

      if (
        d.updatedAt &&
        (!group.latestUpdatedAt || new Date(d.updatedAt) > new Date(group.latestUpdatedAt))
      ) {
        group.latestUpdatedAt = d.updatedAt;
      }
    }

    let groups = [...map.values()]
      .map((g) => ({
        ...g,
        _id: g.key,
        branchCount: g.branches.length,
        isMultiBranch: g.branches.length > 1,
        manageUserId: g.branches[0]?.userId || null,
      }))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const count = groups.length;
    const totalPages = Math.ceil(count / limit) || 0;
    const start = (page - 1) * limit;
    let data = groups.slice(start, start + limit);

    // Branch users: scoped query has only their row — enrich sibling branch tags for UX.
    const actorRole = normalizeRole(req.user?.role);
    if (!isSuperAdminRole(actorRole) && data.length > 0) {
      const enriched = [];
      for (const g of data) {
        const sample =
          doctors.find((d) => doctorIdentityKey(d) === g.key) ||
          (g.manageUserId ? await User.findById(g.manageUserId).lean() : null);
        if (!sample) {
          enriched.push(g);
          continue;
        }
        const siblings = await findDoctorSiblings(sample);
        if (!siblings.length) {
          enriched.push(g);
          continue;
        }
        const populated = await User.find({ _id: { $in: siblings.map((s) => s._id) } })
          .populate("branchId", "name code")
          .lean();
        const branches = populated.map((u) => ({
          userId: String(u._id),
          branchId: branchRefKey(u.branchId),
          branchName: u.branchId?.name || u.branchId?.code || "Unassigned",
          updatedAt: u.updatedAt || null,
        }));
        const local =
          branches.find((b) => String(b.userId) === String(g.manageUserId)) || branches[0];
        enriched.push({
          ...g,
          branches,
          branchCount: branches.length,
          isMultiBranch: branches.length > 1,
          manageUserId: local?.userId || g.manageUserId,
        });
      }
      data = enriched;
    }

    return res.status(200).json({
      status: "ok",
      data,
      count,
      totalPages,
      page,
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// 3. Get user by id
const getuserById = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: "fail", message: "user not found" });
    }
    if (!(await canManageTargetUser(req.user, user))) {
      return res.status(403).json({ status: "fail", message: "Forbidden" });
    }
    return res.status(200).json({ status: "ok", data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function applyDoctorBranchAssignments(actor, anchorUser, branchIdsFromBody, profilePayload) {
  const siblings = await findDoctorSiblings(anchorUser);
  const siblingIds = siblings.map((s) => s._id);
  const email = profilePayload.email ?? anchorUser.email;
  const phone = profilePayload.phone ?? anchorUser.phone;

  for (const bid of branchIdsFromBody) {
    const conflict = await doctorConflictInBranch({
      email,
      phone,
      branchId: bid,
      excludeUserIds: siblingIds,
    });
    if (conflict) {
      return { ok: false, status: 500, message: conflict };
    }
  }

  const siblingByBranch = new Map(
    siblings.map((s) => [branchRefKey(s.branchId), s]),
  );
  const desired = new Set(branchIdsFromBody.map(String));
  const profile = cleanDoctorProfilePayload(profilePayload);
  const doctorRoleKey =
    normalizeRole(profile.role || anchorUser.role) &&
    isDoctorRoleKey(profile.role || anchorUser.role)
      ? normalizeRole(profile.role || anchorUser.role)
      : "doctor";

  for (const bid of branchIdsFromBody) {
    const rowPayload = { ...profile, branchId: bid, role: doctorRoleKey };
    const existingRow = siblingByBranch.get(String(bid));
    if (existingRow) {
      const sync = await syncTabsFromRoleDoc(actor, rowPayload, existingRow);
      if (!sync.ok) {
        return { ok: false, status: 403, message: sync.message };
      }
      await User.findByIdAndUpdate(existingRow._id, sync.payload, { new: true });
    } else {
      const createPayload = {
        ...doctorBaseDocForClone(anchorUser),
        ...profile,
        branchId: bid,
        role: doctorRoleKey,
        image: profile.image || anchorUser.image,
        password: profile.password || anchorUser.password,
      };
      const sync = await syncTabsFromRoleDoc(actor, createPayload, null);
      if (!sync.ok) {
        return { ok: false, status: 403, message: sync.message };
      }
      const created = await User.create(sync.payload);
      siblingByBranch.set(String(bid), created.toObject ? created.toObject() : created);
    }
  }

  for (const s of siblings) {
    const bid = branchRefKey(s.branchId);
    if (!desired.has(bid)) {
      await User.findByIdAndDelete(s._id);
    }
  }

  let anchorUpdated = await User.findById(anchorUser._id);
  if (!anchorUpdated) {
    anchorUpdated = await User.findOne({
      role: /^doctor(_.*)?$/i,
      branchId: branchIdsFromBody[0],
      email: anchorUser.email,
    });
  }

  return {
    ok: true,
    data: anchorUpdated,
    branchCount: branchIdsFromBody.length,
    message: `Doctor updated across ${branchIdsFromBody.length} branch(es)`,
  };
}

const getDoctorBranches = async (req, res) => {
  try {
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ status: "fail", message: "user not found" });
    }
    if (!isDoctorRoleKey(existingUser.role)) {
      return res.status(400).json({ status: "fail", message: "Not a doctor user" });
    }
    if (!(await canManageTargetUser(req.user, existingUser))) {
      return res.status(403).json({ status: "fail", message: "Forbidden" });
    }

    const siblings = await findDoctorSiblings(existingUser);
    const populated = await User.find({ _id: { $in: siblings.map((s) => s._id) } })
      .populate("branchId", "name code")
      .lean();

    const branches = populated.map((u) => ({
      userId: String(u._id),
      branchId: branchRefKey(u.branchId),
      branchName: u.branchId?.name || u.branchId?.code || "Unassigned",
    }));

    return res.status(200).json({
      status: "ok",
      branchIds: branches.map((b) => b.branchId).filter(Boolean),
      branches,
    });
  } catch (err) {
    return res.status(500).json({ status: "fail", message: err.message });
  }
};

const syncDoctorBranches = async (req, res) => {
  try {
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ status: "fail", message: "user not found" });
    }
    if (!isDoctorRoleKey(existingUser.role)) {
      return res.status(400).json({ status: "fail", message: "Not a doctor user" });
    }
    if (!(await canManageTargetUser(req.user, existingUser))) {
      return res.status(403).json({ status: "fail", message: "Forbidden" });
    }

    const actorRole = normalizeRole(req.user?.role);
    const profilePayload = cleanDoctorProfilePayload(req.body.profile || req.body);
    const doctorRoleKey = isDoctorRoleKey(profilePayload.role || existingUser.role)
      ? normalizeRole(profilePayload.role || existingUser.role)
      : "doctor";

    // Branch admin: profile only on this branch row — never wipe sibling branches.
    if (!isSuperAdminRole(actorRole)) {
      const sync = await syncTabsFromRoleDoc(
        req.user,
        { ...profilePayload, role: doctorRoleKey, branchId: existingUser.branchId },
        existingUser,
      );
      if (!sync.ok) {
        return res.status(403).json({ status: "fail", message: sync.message });
      }
      const updated = await User.findByIdAndUpdate(existingUser._id, sync.payload, {
        new: true,
      });
      return res.status(200).json({
        status: "ok",
        data: updated,
        branchCount: 1,
        message: "Doctor updated for this branch",
      });
    }

    const branchIdsFromBody = parseBranchIdsFromBody(req.body, null);
    if (!branchIdsFromBody.length) {
      return res.status(400).json({
        status: "fail",
        message: "Select at least one branch",
      });
    }

    const result = await applyDoctorBranchAssignments(
      req.user,
      existingUser,
      branchIdsFromBody,
      profilePayload,
    );

    if (!result.ok) {
      return res.status(result.status || 500).json({
        status: "fail",
        message: result.message || "Could not update doctor branches",
      });
    }

    return res.status(200).json({
      status: "ok",
      data: result.data,
      branchCount: result.branchCount,
      message: result.message,
    });
  } catch (err) {
    return res.status(500).json({ status: "fail", message: err.message });
  }
};

// 4. Update user
const updateuser = async (req, res) => {
  try {
    let id = req.params.id;
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ status: "fail", message: "user not found" });
    }
    if (!(await canManageTargetUser(req.user, existingUser))) {
      return res.status(403).json({ status: "fail", message: "Forbidden" });
    }

    const actorRole = normalizeRole(req.user?.role);
    const incomingRole = normalizeRole(req.body.role);
    if (isBranchAdminRole(actorRole) && incomingRole === "superadmin") {
      return res
        .status(403)
        .json({ status: "fail", message: "Branch admin cannot promote to superadmin" });
    }

    let getImage = await User.findById(id);
    
    // Safely handle the image file
    let image = getImage.image; // default to existing image
    
    if (req.files && req.files.image && req.files.image[0]) {
      image = req.files.image[0].filename;
    }

    const payload = { ...req.body, image: image };
    if (payload.isActive !== undefined) {
      payload.isActive = normalizeIsActiveFlag(payload.isActive);
    }
    const isDoctor = isDoctorRoleKey(existingUser.role);
    // Profile-only updates must not reshuffle multi-branch membership.
    const branchIdsFromBody =
      isDoctor &&
      isSuperAdminRole(actorRole) &&
      bodyHasExplicitBranchAssignment(req.body)
        ? parseBranchIdsFromBody(req.body, null)
        : [];

    if (isBranchAdminRole(actorRole) && !isSuperAdminRole(actorRole)) {
      let actorBr = req.user.branchId;
      if (!actorBr && req.user._id) {
        actorBr = await loadBranchIdFromUserDoc(req.user._id);
      }
      if (!isDoctor) {
        payload.branchId = actorBr;
      }
    }

    const profilePayload = cleanDoctorProfilePayload(payload);

    if (isDoctor && branchIdsFromBody.length > 0) {
      const result = await applyDoctorBranchAssignments(
        req.user,
        existingUser,
        branchIdsFromBody,
        profilePayload,
      );
      if (!result.ok) {
        return res.status(result.status || 500).json({
          status: "fail",
          message: result.message || "Could not update doctor branches",
        });
      }
      return res.status(200).json({
        status: "ok",
        data: result.data,
        branchCount: result.branchCount,
        message: result.message,
      });
    }

    const sync = await syncTabsFromRoleDoc(req.user, payload, existingUser);
    if (!sync.ok) {
      return res.status(403).json({ status: "fail", message: sync.message });
    }

    // Multi-branch doctors: keep isActive in sync across sibling User rows.
    if (isDoctor && sync.payload.isActive !== undefined) {
      const siblings = await findDoctorSiblings(existingUser);
      const ids = siblings.map((s) => s._id).filter(Boolean);
      if (ids.length > 1) {
        await User.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: sync.payload.isActive } },
        );
      }
    }

    const updateduser = await User.findByIdAndUpdate(
      id,
      sync.payload,
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updateduser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete user
const deleteuser = async (req, res) => {
  try {
    const id = req.params.id;
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ status: "fail", message: "user not found" });
    }
    if (!(await canManageTargetUser(req.user, targetUser))) {
      return res.status(403).json({ status: "fail", message: "Forbidden" });
    }
    await User.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "user deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }
    const refreshed = await refreshUserTabsFromRole(user);
    return res.status(200).json({ status: "ok", data: refreshed });
  } catch (err) {
    return res.status(500).json({ status: "fail", message: err.message });
  }
};

module.exports = {
  adduser,
  getusers,
  getDoctorsGrouped,
  getDoctorBranches,
  syncDoctorBranches,
  getuserById,
  updateuser,
  deleteuser,
  registerSuperAdmin,
  getCurrentUser,
};

async function registerSuperAdmin(req, res) {
  try {
    const setupKeyEnv = process.env.SUPERADMIN_SETUP_KEY;
    const providedKey =
      req.headers['x-setup-key'] || req.headers['x-setupkey'] || req.body?.setupKey;

    if (setupKeyEnv && String(providedKey || '') !== String(setupKeyEnv)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    const existing = await User.findOne({
      $or: [{ role: /^(superadmin)$/i }, { role: /^(super\s*admin)$/i }],
    }).lean();

    if (existing) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Super Admin already exists' });
    }

    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'name, email, phone and password are required',
      });
    }

    const checkPhone = await User.findOne({ phone });
    const checkemail = await User.findOne({ email });

    if (checkemail) {
      return res.status(400).json({ status: 'fail', message: 'Email already exist!' });
    }
    if (checkPhone) {
      return res.status(400).json({ status: 'fail', message: 'Phone already exist!' });
    }

    const user = await User.create({
      ...req.body,
      name,
      email,
      phone,
      password,
      role: 'superadmin',
      branchId: undefined,
    });

    const token = jwt.sign({ id: user?._id }, 'health', { expiresIn: '30d' });
    return res.status(200).json({ status: 'ok', data: user, token });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
}
