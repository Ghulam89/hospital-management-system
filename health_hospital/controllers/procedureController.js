const Procedure = require("../models/procedureModel");
const Department = require("../models/departmentModel");

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

    const procedures = await Procedure.find({
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { phone: { $regex: ".*" + search + ".*", $options: "i" } },
        { cnic: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    }).sort({createdAt:-1}).populate({
        path: 'departmentId',
        select: 'name _id subDepartment',
       
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Procedure.find({
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { phone: { $regex: ".*" + search + ".*", $options: "i" } },
        { cnic: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    })
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
