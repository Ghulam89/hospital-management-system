const PharmManufacturer = require("../models/pharmManufacturerModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible, mergeCatalogPreferenceFilter } = require("../utils/branchScope");

// 1. Create pharmManufacturer
const addpharmManufacturer = async (req, res) => {
  try {
    const data = await PharmManufacturer.create(assignBranchIdForCreate(req, { ...req.body }));
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getpharmManufacturers = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? req.query?.limit : 20;

    const catalogFilter = await mergeCatalogPreferenceFilter(req);
    const filters = [catalogFilter];
    const q = String(search || "").trim();
    if (q) {
      filters.push({ name: { $regex: q, $options: "i" } });
    }
    const baseQuery = filters.length === 1 ? filters[0] : { $and: filters };

    const data = await PharmManufacturer.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmManufacturer.countDocuments(baseQuery);

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

// 3. Get pharmManufacturer by id
const getpharmManufacturerById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }
    const id = req.params.id;
    const data = await PharmManufacturer.findById(id);
    if (!data) {
      return res.status(404).json({ status: "fail", message: "Pharmacy manufacturer not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmManufacturer
const updatepharmManufacturer = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await PharmManufacturer.findById(id);
    if (!getImage || !(await branchDocumentVisible(req, getImage.branchId))) {
      return res.status(404).json({ status: "fail", message: "Pharmacy manufacturer not found" });
    }

    const data = await PharmManufacturer.findByIdAndUpdate(id, { ...req.body }, { new: true });
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmManufacturer
const deletepharmManufacturer = async (req, res) => {
  try {
    const id = req.params.id;
    const row = await PharmManufacturer.findById(id);
    if (!row || !(await branchDocumentVisible(req, row.branchId))) {
      return res.status(404).json({ status: "fail", message: "Pharmacy manufacturer not found" });
    }
    await PharmManufacturer.findByIdAndDelete(id);
    return res.status(200).json({ status: "ok", message: "Pharmacy Manufacturer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpharmManufacturer,
  getpharmManufacturers,
  getpharmManufacturerById,
  updatepharmManufacturer,
  deletepharmManufacturer,
};
