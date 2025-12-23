const PharmCategory = require("../models/pharmCategoryModel");

// 1. Create pharmCategory
const addpharmCategory = async (req, res) => {
  try {



      const data = await PharmCategory.create({ ...req.body });
      return res.status(200).json({ status: "ok", data: data });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getpharmCategorys = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit?req.query?.limit:20;

    // Create base query with optional gender filter
    const baseQuery = {};


    const data = await PharmCategory.find(baseQuery).sort({createdAt:-1})
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
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Get pharmCategory by id
const getpharmCategoryById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmCategory.findById(id);
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
    

    const data = await PharmCategory.findByIdAndUpdate(
      id,
      { ...req.body,  },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmCategory
const deletepharmCategory = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmCategory.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Pharmacy Category deleted successfully" });
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
