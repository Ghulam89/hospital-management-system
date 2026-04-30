const PharmCategory = require("../models/pharmCategoryModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible, mergeCatalogPreferenceFilter } = require("../utils/branchScope");

// 1. Create pharmCategory
const addpharmCategory = async (req, res) => {
  try {
    const data = await PharmCategory.create(assignBranchIdForCreate(req, { ...req.body }));
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getpharmCategorys = async (req, res) => {
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

    const data = await PharmCategory.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmCategory.countDocuments(baseQuery);

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

// 3. Get pharmCategory by id
const getpharmCategoryById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }
    const id = req.params.id;
    const data = await PharmCategory.findById(id);
    if (!data) {
      return res.status(404).json({ status: "fail", message: "Pharmacy category not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmCategory
const updatepharmCategory = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await PharmCategory.findById(id);
    if (!getImage || !(await branchDocumentVisible(req, getImage.branchId))) {
      return res.status(404).json({ status: "fail", message: "Pharmacy category not found" });
    }

    const data = await PharmCategory.findByIdAndUpdate(id, { ...req.body }, { new: true });
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmCategory
const deletepharmCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const row = await PharmCategory.findById(id);
    if (!row || !(await branchDocumentVisible(req, row.branchId))) {
      return res.status(404).json({ status: "fail", message: "Pharmacy category not found" });
    }
    await PharmCategory.findByIdAndDelete(id);
    return res.status(200).json({ status: "ok", message: "Pharmacy Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpharmCategory,
  getpharmCategorys,
  getpharmCategoryById,
  updatepharmCategory,
  deletepharmCategory,
};
