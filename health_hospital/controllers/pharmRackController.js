const PharmRack = require("../models/pharmRackModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible } = require("../utils/branchScope");

// 1. Create pharmRack
const addpharmRack = async (req, res) => {
  try {
    const data = await PharmRack.create(assignBranchIdForCreate(req, { ...req.body }));
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getpharmRacks = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? req.query?.limit : 20;

    const baseQuery = {};

    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(baseQuery, branchQ);

    if (search) {
      baseQuery.name = { $regex: search, $options: "i" };
    }

    const data = await PharmRack.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmRack.countDocuments(baseQuery);

    return res.status(200).json({
      status: "ok",
      data: data,
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

// 3. Get pharmRack by id
const getpharmRackById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmRack.findById(id);
    if (!data || !(await branchDocumentVisible(req, data.branchId))) {
      return res.status(404).json({ status: "fail", message: "Pharmacy rack not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmRack
const updatepharmRack = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await PharmRack.findById(id);
    if (!getImage || !(await branchDocumentVisible(req, getImage.branchId))) {
      return res.status(404).json({ status: "fail", message: "Pharmacy rack not found" });
    }

    const data = await PharmRack.findByIdAndUpdate(id, { ...req.body }, { new: true });
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmRack
const deletepharmRack = async (req, res) => {
  try {
    const id = req.params.id;
    const row = await PharmRack.findById(id);
    if (!row || !(await branchDocumentVisible(req, row.branchId))) {
      return res.status(404).json({ status: "fail", message: "Pharmacy rack not found" });
    }
    await PharmRack.findByIdAndDelete(id);
    return res.status(200).json({ status: "ok", message: "Pharmacy Rack deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpharmRack,
  getpharmRacks,
  getpharmRackById,
  updatepharmRack,
  deletepharmRack,
};
