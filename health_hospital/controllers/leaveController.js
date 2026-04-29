const Leave = require("../models/leaveModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible } = require("../utils/branchScope");

// 1. Create Detail
const addDetail = async (req, res) => {
  try {
    const Detail = await Leave.create(assignBranchIdForCreate(req, { ...req.body }));
    return res.status(200).json({ status: "ok", data: Detail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Get all Details
const getDetails = async (req, res) => {
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

    let query = {};

    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(query, branchQ);

    const Details = await Leave.find(query)
      .sort({ createdAt: -1 })
      .populate(["doctorId", "patientId"])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Leave.find(query).populate(["doctorId", "patientId"]).countDocuments();

    return res.status(200).json({
      status: "ok",
      data: Details,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Get Detail by id
const getDetailById = async (req, res) => {
  try {
    const id = req.params.id;
    const Detail = await Leave.findById(id);
    if (!Detail || !(await branchDocumentVisible(req, Detail.branchId))) {
      return res.status(404).json({ status: "fail", message: "Leave record not found" });
    }
    return res.status(200).json({ status: "ok", data: Detail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update Detail
const updateDetail = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await Leave.findById(id);
    if (!getImage || !(await branchDocumentVisible(req, getImage.branchId))) {
      return res.status(404).json({ status: "fail", message: "Leave record not found" });
    }

    const updatedDetail = await Leave.findByIdAndUpdate(id, { ...req.body }, { new: true });
    return res.status(200).json({ status: "ok", data: updatedDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete Detail
const deleteDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const row = await Leave.findById(id);
    if (!row || !(await branchDocumentVisible(req, row.branchId))) {
      return res.status(404).json({ status: "fail", message: "Leave record not found" });
    }
    await Leave.findByIdAndDelete(id);
    return res.status(200).json({ status: "ok", message: "Detail deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addDetail,
  getDetails,
  getDetailById,
  updateDetail,
  deleteDetail,
};
