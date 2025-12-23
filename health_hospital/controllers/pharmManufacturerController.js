const PharmManufacturer = require("../models/pharmManufacturerModel");

// 1. Create pharmManufacturer
const addpharmManufacturer = async (req, res) => {
  try {
    const data = await PharmManufacturer.create({ ...req.body });
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getpharmManufacturers = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit?req.query?.limit:20;

    // Create base query with search functionality
    const baseQuery = {};
    
    if (search) {
      baseQuery.name = { $regex: search, $options: 'i' };
    }

    const data = await PharmManufacturer.find(baseQuery).sort({createdAt:-1})
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
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Get pharmManufacturer by id
const getpharmManufacturerById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmManufacturer.findById(id);
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
    

    const data = await PharmManufacturer.findByIdAndUpdate(
      id,
      { ...req.body,  },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmManufacturer
const deletepharmManufacturer = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmManufacturer.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Pharmacy Manufacturer deleted successfully" });
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
