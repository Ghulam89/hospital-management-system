const PharmSupplier = require("../models/pharmSupplierModel");

// 1. Create pharmSupplier
const addpharmSupplier = async (req, res) => {
  try {



      const data = await PharmSupplier.create({ ...req.body });
      return res.status(200).json({ status: "ok", data: data });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getpharmSuppliers = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit?req.query?.limit:20;

    // Create base query with optional gender filter
    const baseQuery = {};


    const data = await PharmSupplier.find(baseQuery).sort({createdAt:-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmSupplier.countDocuments(baseQuery);

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

// 3. Get pharmSupplier by id
const getpharmSupplierById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmSupplier.findById(id);
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmSupplier
const updatepharmSupplier = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await PharmSupplier.findById(id);
    

    const data = await PharmSupplier.findByIdAndUpdate(
      id,
      { ...req.body,  },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmSupplier
const deletepharmSupplier = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmSupplier.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Pharmacy Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpharmSupplier,
  getpharmSuppliers,
  getpharmSupplierById,
  updatepharmSupplier,
  deletepharmSupplier,

};
