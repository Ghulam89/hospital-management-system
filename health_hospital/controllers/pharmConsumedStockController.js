const PharmConsumedStock = require("../models/pharmConsumedStockModel");

// 1. Create Consumed Stock
const addConsumedStock = async (req, res) => {
  try {
    console.log('Creating consumed stock with data:', req.body);
    
    // Validate required fields
    if (!req.body.pharmItemId) {
      return res.status(400).json({ 
        status: "error", 
        message: "Pharmacy item ID is required" 
      });
    }
    
    if (!req.body.quantity || req.body.quantity <= 0) {
      return res.status(400).json({ 
        status: "error", 
        message: "Valid quantity is required" 
      });
    }
    
    if (!req.body.consumedBy) {
      return res.status(400).json({ 
        status: "error", 
        message: "User ID (consumedBy) is required" 
      });
    }
    
    // Map itemId to pharmItemId if itemId is provided
    const dataToSave = { ...req.body };
    if (dataToSave.itemId && !dataToSave.pharmItemId) {
      dataToSave.pharmItemId = dataToSave.itemId;
      delete dataToSave.itemId;
    }
    
    // Map consumedBy to consumedById if consumedBy is provided
    if (dataToSave.consumedBy && !dataToSave.consumedById) {
      dataToSave.consumedBy = dataToSave.consumedBy;
    }
    
    // Ensure dates are properly formatted
    if (dataToSave.consumptionDate) {
      dataToSave.consumptionDate = new Date(dataToSave.consumptionDate);
    }
    
    const data = await PharmConsumedStock.create(dataToSave);
    console.log('Consumed stock created successfully:', data._id);
    
    return res.status(200).json({ status: "ok", message: "Stock consumed successfully", data: data });
  } catch (err) {
    console.error('Error creating consumed stock:', err);
    const errorMessage = err.message || 'Failed to consume stock';
    return res.status(500).json({ 
      status: "error",
      message: errorMessage,
      error: err.message 
    });
  }
};

// 2. Get Consumed Stocks
const getConsumedStocks = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const baseQuery = {};

    // Optional filters
    if (req.query.departmentId) {
      baseQuery.departmentId = req.query.departmentId;
    }

    if (req.query.status) {
      baseQuery.status = req.query.status;
    }

    if (req.query.reason) {
      baseQuery.reason = req.query.reason;
    }

    // Filter by consumptionDate date range
    if (req.query.from || req.query.to) {
      baseQuery.consumptionDate = {};
      if (req.query.from) {
        baseQuery.consumptionDate.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        baseQuery.consumptionDate.$lte = new Date(req.query.to);
      }
    }

    // Search by item name or reason (case-insensitive)
    if (search) {
      baseQuery.$or = [
        { reason: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } }
      ];
    }

    const data = await PharmConsumedStock.find(baseQuery)
      .populate('pharmItemId', 'name barcode availableQuantity unitCost')
      .populate('departmentId', 'name')
      .populate('consumedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmConsumedStock.countDocuments(baseQuery);

    return res.status(200).json({
      status: "ok",
      data,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// 3. Get Consumed Stock by ID
const getConsumedStockById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmConsumedStock.findById(id)
      .populate('pharmItemId', 'name barcode availableQuantity unitCost')
      .populate('departmentId', 'name')
      .populate('consumedBy', 'name email');
    
    if (!data) {
      return res.status(404).json({ 
        status: "error", 
        message: "Consumed stock not found" 
      });
    }
    
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    console.error('Error fetching consumed stock:', err);
    res.status(500).json({ error: err.message });
  }
};

// 4. Update Consumed Stock
const updateConsumedStock = async (req, res) => {
  try {
    let id = req.params.id;
    
    // Clean the request body
    const cleanedBody = { ...req.body };
    if (cleanedBody.itemId && !cleanedBody.pharmItemId) {
      cleanedBody.pharmItemId = cleanedBody.itemId;
      delete cleanedBody.itemId;
    }
    
    const data = await PharmConsumedStock.findByIdAndUpdate(
      id,
      cleanedBody,
      { new: true }
    )
    .populate('pharmItemId', 'name barcode availableQuantity unitCost')
    .populate('departmentId', 'name')
    .populate('consumedBy', 'name email');
    
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    console.error('Error updating consumed stock:', err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete Consumed Stock
const deleteConsumedStock = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmConsumedStock.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Consumed stock deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Get Consumed Stock Statistics
const getConsumedStockStats = async (req, res) => {
  try {
    const totalConsumedStocks = await PharmConsumedStock.countDocuments();
    const activeConsumedStocks = await PharmConsumedStock.countDocuments({ status: 'Active' });
    const completedConsumedStocks = await PharmConsumedStock.countDocuments({ status: 'Completed' });
    
    const totalCost = await PharmConsumedStock.aggregate([
      { $group: { _id: null, total: { $sum: "$totalCost" } } }
    ]);

    const totalQuantity = await PharmConsumedStock.aggregate([
      { $group: { _id: null, total: { $sum: "$quantity" } } }
    ]);

    const departmentStats = await PharmConsumedStock.aggregate([
      { $group: { _id: "$departmentId", count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" }, totalCost: { $sum: "$totalCost" } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
      { $sort: { count: -1 } }
    ]);

    const reasonStats = await PharmConsumedStock.aggregate([
      { $group: { _id: "$reason", count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" }, totalCost: { $sum: "$totalCost" } } },
      { $sort: { count: -1 } }
    ]);

    return res.status(200).json({
      status: "ok",
      data: {
        totalConsumedStocks,
        activeConsumedStocks,
        completedConsumedStocks,
        totalCost: totalCost[0]?.total || 0,
        totalQuantity: totalQuantity[0]?.total || 0,
        departmentStats,
        reasonStats
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addConsumedStock,
  getConsumedStocks,
  getConsumedStockById,
  updateConsumedStock,
  deleteConsumedStock,
  getConsumedStockStats
};