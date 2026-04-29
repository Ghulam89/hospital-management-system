const Procedure = require("../models/procedureModel");
const Department = require("../models/departmentModel");
const { getScopedDepartmentIds, idInList } = require("../utils/branchScope");

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

      const data = await Procedure.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: data });
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

      const data = await Procedure.create({ ...req.body,departmentId:departmentId?._id });
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
      ],
    };

    const deptIds = await getScopedDepartmentIds(req);
    let findQuery = searchOr;
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
      findQuery = { $and: [searchOr, { departmentId: { $in: deptIds } }] };
    }

    const procedures = await Procedure.find(findQuery).sort({createdAt:-1}).populate({
        path: 'departmentId',
        select: 'name _id subDepartment',
       
      })
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
    const data = await Procedure.findById(id).populate({
        path: 'departmentId',
        select: 'name _id subDepartment',
       
      });
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

    const data = await Procedure.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
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
