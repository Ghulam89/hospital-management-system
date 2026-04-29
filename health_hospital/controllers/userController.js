const mongoose = require("mongoose");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { normalizeRole } = require("../middleware/auth");
const {
  findRoleDocForLogin,
  refreshUserTabsFromRole,
} = require("../utils/syncUserTabsFromRole");

const isSuperAdminRole = (role) => normalizeRole(role) === "superadmin";
const isBranchAdminRole = (role) => {
  const r = normalizeRole(role);
  return r === "administrator" || r === "admin";
};

const isWithinActorBranch = (actor, targetBranchId) => {
  if (!actor) return false;
  if (isSuperAdminRole(actor.role)) return true;
  return String(actor.branchId || "") === String(targetBranchId || "");
};

const canManageTargetUser = (actor, targetUser) => {
  if (!actor || !targetUser) return false;
  if (isSuperAdminRole(actor.role)) return true;
  if (!isBranchAdminRole(actor.role)) return false;
  if (!isWithinActorBranch(actor, targetUser.branchId)) return false;
  return !isSuperAdminRole(targetUser.role);
};

/**
 * Custom roles (Role doc, isSystem false) define access; tabs must mirror Role.permissions.
 * Branch-scoped roles (branchId set) may only be assigned to users in that branch.
 */
async function syncTabsFromRoleDoc(actor, payload, existingUser) {
  const rawRole =
    payload.role !== undefined && payload.role !== null
      ? payload.role
      : existingUser?.role;
  if (!String(rawRole || "").trim()) return { ok: true, payload };

  const roleDoc = await findRoleDocForLogin(rawRole);
  if (!roleDoc || roleDoc.isSystem) {
    return { ok: true, payload };
  }

  let effectiveBranchId = payload.branchId;
  if (existingUser && (effectiveBranchId === undefined || effectiveBranchId === null)) {
    effectiveBranchId = existingUser.branchId;
  }

  const actorRole = normalizeRole(actor?.role);
  if (isBranchAdminRole(actorRole) && !isSuperAdminRole(actorRole)) {
    effectiveBranchId = actor.branchId;
    payload.branchId = actor.branchId;
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

    const checkPhone = await User.findOne({ phone: req.body.phone });
    const checkemail = await User.findOne({ email: req.body.email });

    if (req.body.email && checkemail) {
      return res
        .status(500)
        .json({ status: "fail", message: "Email already exist!" });
    }
    else if (req.body.phone && checkPhone) {
      return res
        .status(500)
        .json({ status: "fail", message: "Phone already exist!" });
    }
    else {

      if (requestedRole === "administrator" && !req.body.branchId && !actor?.branchId) {
        return res
          .status(400)
          .json({ status: "fail", message: "branchId is required for administrator" });
      }

      if (isBranchAdminRole(actorRole)) {
        if (requestedRole === "superadmin") {
          return res
            .status(403)
            .json({ status: "fail", message: "Branch admin cannot create superadmin" });
        }
        if (!actor?.branchId) {
          return res
            .status(400)
            .json({ status: "fail", message: "Branch admin has no assigned branch" });
        }
      }

      const payload = { ...req.body };
      if (isBranchAdminRole(actorRole) && !isSuperAdminRole(actorRole)) {
        payload.branchId = actor.branchId;
      } else if (!payload.branchId && actor?.branchId) {
        payload.branchId = actor.branchId;
      }

      const sync = await syncTabsFromRoleDoc(actor, payload, null);
      if (!sync.ok) {
        return res.status(403).json({ status: "fail", message: sync.message });
      }

      const user = await User.create(sync.payload);
      const token = jwt.sign({ id: user?._id }, 'health', { expiresIn: '30d' });
      return res.status(200).json({ status: "ok", data: user, token });
    }
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

    // Build base query
    const query = {};

    const actor = req.user;
    const actorRole = normalizeRole(actor?.role);

    if (req.query.role) {
      query.role = req.query.role;
    }

    // Superadmin: all branches unless ?branchId is a real ObjectId (not "all").
    if (isSuperAdminRole(actorRole)) {
      const raw = req.query.branchId;
      const s = raw != null ? String(raw).trim() : "";
      if (s && s !== "all" && mongoose.Types.ObjectId.isValid(s)) {
        query.branchId = s;
      }
    } else if (actor?.branchId) {
      query.branchId = actor.branchId;
    } else if (!isSuperAdminRole(actorRole) && !actor?.branchId) {
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

    // Search condition
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

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



// 3. Get user by id
const getuserById = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: "fail", message: "user not found" });
    }
    if (!canManageTargetUser(req.user, user)) {
      return res.status(403).json({ status: "fail", message: "Forbidden" });
    }
    return res.status(200).json({ status: "ok", data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    if (!canManageTargetUser(req.user, existingUser)) {
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
    if (isBranchAdminRole(actorRole) && !isSuperAdminRole(actorRole)) {
      payload.branchId = req.user.branchId;
    }

    const sync = await syncTabsFromRoleDoc(req.user, payload, existingUser);
    if (!sync.ok) {
      return res.status(403).json({ status: "fail", message: sync.message });
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
    if (!canManageTargetUser(req.user, targetUser)) {
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
