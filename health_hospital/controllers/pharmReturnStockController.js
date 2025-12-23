const PharmReturnStock = require("../models/pharmReturnStockModel");

// 1. Create pharmReturnStock
const addpharmReturnStock = async (req, res) => {
  try {



      const data = await PharmReturnStock.create({ ...req.body });
      return res.status(200).json({ status: "ok", data: data });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getpharmReturnStocks = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    // Create base query with optional filters
    const baseQuery = {};

    if (search) {
      baseQuery.returnNumber = { $regex: search, $options: 'i' };
    }

    if (req.query.supplierId) {
      baseQuery.supplierId = req.query.supplierId;
    }

    if (req.query.from && req.query.to) {
      baseQuery.returnDate = {
        $gte: new Date(req.query.from),
        $lte: new Date(req.query.to)
      };
    }

    const data = await PharmReturnStock.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('supplierId', 'name phone email')
      .populate('items.itemId', 'name barcode')
      .populate('createdBy', 'name email')
      .exec();

    const count = await PharmReturnStock.countDocuments(baseQuery);

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

// 3. Get pharmReturnStock by id
const getpharmReturnStockById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmReturnStock.findById(id)
      .populate('supplierId', 'name phone email address')
      .populate('items.itemId', 'name barcode unitPrice')
      .populate('createdBy', 'name email');
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmReturnStock
const updatepharmReturnStock = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await PharmReturnStock.findById(id);
    

    const data = await PharmReturnStock.findByIdAndUpdate(
      id,
      { ...req.body,  },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmReturnStock
const deletepharmReturnStock = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmReturnStock.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Pharmacy Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpharmReturnStock,
  getpharmReturnStocks,
  getpharmReturnStockById,
  updatepharmReturnStock,
  deletepharmReturnStock,

};
