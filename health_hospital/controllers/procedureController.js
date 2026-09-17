const Procedure = require("../models/procedureModel");
const Department = require("../models/departmentModel");
const { getScopedDepartmentIds, idInList, resolveBranchIdForNonSuperAdmin} = require("../utils/branchScope");
const { normalizeRole } = require("../middleware/auth");
const { sanitizeProcedureBody } = require("../utils/sanitizeProcedureBody");

/** Branch users may edit only procedures this branch created (procedure.branchId). */
async function branchUserOwnsProcedureRecord(req, procedureRow) {
  if (!req.user) return false;
  const role = normalizeRole(req.user.role);
  if (role === "superadmin" || role === "super admin") return true;
  if (!procedureRow?.branchId) return false;
  const userBranch = await resolveBranchIdForNonSuperAdmin(req);
  if (!userBranch) return false;
  return String(procedureRow.branchId) === String(userBranch);
}

async function buildProcedureCreatePayload(req, body) {
  const payload = sanitizeProcedureBody(body);
  const role = normalizeRole(req.user?.role);
  // Super admin rows stay hospital-wide (no branchId) — visible to all, editable by super admin only.
  if (role === "superadmin" || role === "super admin") {
    return payload;
  }
  const userBranch = await resolveBranchIdForNonSuperAdmin(req);
  if (userBranch) payload.branchId = userBranch;
  if (req.user?._id) payload.createdBy = req.user._id;
  return payload;
}

const procedurePopulate = [
  { path: "departmentId", select: "name _id subDepartment branchId" },
  { path: "doctorShares.doctorId", select: "name sharePrice shareType" },
  { path: "defaultExpenses.expenseCategoryId", select: "name" },
  { path: "consumptions.pharmItemId", select: "name" },
];

// 1. Create procedure
const addprocedure = async (req, res) => {
  try {


    const checkName = await Procedure.findOne({ name: req.body.name });

    if (req.body.name && checkName) {
      return res
        .status(500)
        .json({ status: "fail", message: "Name already exist!" });
    }
    else {

      const deptIds = await getScopedDepartmentIds(req);
      if (deptIds !== null && deptIds.length === 0) {
        return res.status(403).json({ status: "fail", message: "No departments for this branch" });
      }
      if (deptIds !== null && req.body.departmentId && !idInList(req.body.departmentId, deptIds)) {
        return res.status(403).json({ status: "fail", message: "Department not allowed for this branch" });
      }

      const data = await Procedure.create(await buildProcedureCreatePayload(req, req.body));
      const populated = await Procedure.findById(data._id).populate(procedurePopulate);
      return res.status(200).json({ status: "ok", data: populated || data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 1. Create procedure
const addExcelprocedure = async (req, res) => {
  try {


    const checkName = await Procedure.findOne({ name: req.body.name });

    if (req.body.name && checkName) {
      return res
        .status(500)
        .json({ status: "fail", message: "Name already exist!" });
    }
    else {


      if(!req.body.departmentName){
        return res
        .status(500)
        .json({ status: "fail", message: "Must add department name!" });
      }

      let departmentId=await Department.findOne({name:req.body.departmentName})

      const deptIds = await getScopedDepartmentIds(req);
      if (deptIds !== null && departmentId?._id && !idInList(departmentId._id, deptIds)) {
        return res.status(403).json({ status: "fail", message: "Department not allowed for this branch" });
      }

      const data = await Procedure.create(
        await buildProcedureCreatePayload(req, {
          ...req.body,
          departmentId: departmentId?._id }),
      );
      return res.status(200).json({ status: "ok", data: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all procedures
const getprocedures = async (req, res) => {
  try {




    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    var page = "1";
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = "20";

    const searchOr = {
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { phone: { $regex: ".*" + search + ".*", $options: "i" } },
        { cnic: { $regex: ".*" + search + ".*", $options: "i" } },
      ] };

    const andParts = [searchOr];
    const activeRaw = String(req.query.isActive ?? "true").trim().toLowerCase();
    if (activeRaw !== "all") {
      if (activeRaw === "false" || activeRaw === "0") {
        andParts.push({ isActive: false });
      } else {
        andParts.push({
          $or: [{ isActive: true }, { isActive: { $exists: false } }, { isActive: null }] });
      }
    }

    const deptIds = await getScopedDepartmentIds(req);
    let findQuery = andParts.length === 1 ? andParts[0] : { $and: andParts };
    if (deptIds !== null) {
      if (deptIds.length === 0) {
        return res.status(200).json({
          status: "ok",
          data: [],
          search,
          page,
          count: 0,
          totalPages: 0,
          currentPage: page,
          limit
        });
      }
      findQuery = { $and: [...andParts, { departmentId: { $in: deptIds } }] };
    }

    const procedures = await Procedure.find(findQuery).sort({createdAt:-1}).populate({
        path: 'departmentId',
        select: 'name _id subDepartment branchId' })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Procedure.find(findQuery)
      .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: procedures,
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

// 3. Get procedure by id
const getprocedureById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await Procedure.findById(id).populate(procedurePopulate);
    if (!data) {
      return res.status(404).json({ status: "fail", message: "Procedure not found" });
    }
    const deptIds = await getScopedDepartmentIds(req);
    const deptRef = data.departmentId;
    const deptKey = deptRef && typeof deptRef === 'object' && deptRef._id ? deptRef._id : deptRef;
    if (deptIds !== null && !idInList(deptKey, deptIds)) {
      return res.status(404).json({ status: "fail", message: "Procedure not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update procedure
const updateprocedure = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await Procedure.findById(id);
    if (!getImage) {
      return res.status(404).json({ status: "fail", message: "Procedure not found" });
    }
    const deptIds = await getScopedDepartmentIds(req);
    if (deptIds !== null && !idInList(getImage.departmentId, deptIds)) {
      return res.status(404).json({ status: "fail", message: "Procedure not found" });
    }
    if (deptIds !== null && req.body.departmentId && !idInList(req.body.departmentId, deptIds)) {
      return res.status(403).json({ status: "fail", message: "Department not allowed for this branch" });
    }
    const canMutate = await branchUserOwnsProcedureRecord(req, getImage);
    if (!canMutate) {
      return res.status(403).json({
        status: "fail",
        message: "You can only edit procedures your branch added" });
    }

    // Status-only toggle must not wipe other fields via sanitize defaults.
    const bodyKeys = Object.keys(req.body || {}).filter((k) => req.body[k] !== undefined);
    let updatePayload;
    if (bodyKeys.length === 1 && bodyKeys[0] === "isActive") {
      updatePayload = {
        isActive: !(
          req.body.isActive === false ||
          req.body.isActive === "false" ||
          req.body.isActive === 0 ||
          req.body.isActive === "0"
        ) };
    } else {
      updatePayload = sanitizeProcedureBody(req.body);
    }

    const data = await Procedure.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true }
    ).populate(procedurePopulate);
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete procedure
const deleteprocedure = async (req, res) => {
  try {
    const id = req.params.id;
    const row = await Procedure.findById(id);
    if (!row) {
      return res.status(404).json({ status: "fail", message: "Procedure not found" });
    }
    const deptIds = await getScopedDepartmentIds(req);
    if (deptIds !== null && !idInList(row.departmentId, deptIds)) {
      return res.status(404).json({ status: "fail", message: "Procedure not found" });
    }
    await Procedure.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "procedure deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addprocedure,
  getprocedures,
  getprocedureById,
  updateprocedure,
  deleteprocedure,
addExcelprocedure
};
