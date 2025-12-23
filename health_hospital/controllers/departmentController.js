const Department = require("../models/departmentModel");

// 1. Create department
const adddepartment = async (req, res) => {
  try {


    const checkName = await Department.findOne({ phone: req.body.name });


    if (req.body.name && checkName) {
      return res
        .status(500)
        .json({ status: "fail", message: "Name already exist!" });
    }
    else {

      const department = await Department.create({ ...req.body });
      return res.status(200).json({ status: "ok", data: department });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all departments
const getdepartments = async (req, res) => {
  try {




    const departments = await Department.find({}).sort({createdAt:-1})




    return res.status(200).json({
      status: "ok",
      data: departments,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Get department by id
const getdepartmentById = async (req, res) => {
  try {
    const id = req.params.id;
    const department = await Department.findById(id);
    return res.status(200).json({ status: "ok", data: department });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update department
const updatedepartment = async (req, res) => {
  try {
    let id = req.params.id;

    const updateddepartment = await Department.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updateddepartment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete department
const deletedepartment = async (req, res) => {
  try {
    const id = req.params.id;
    await Department.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "department deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  adddepartment,
  getdepartments,
  getdepartmentById,
  updatedepartment,
  deletedepartment,

};
