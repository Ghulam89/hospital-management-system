const StoreClosing = require("../models/storeClosingModel");

// Create store closing
const createStoreClosing = async (req, res) => {
  try {
    const {
      closingDate,
      openingCash,
      totalSales,
      totalExpenses,
      cashInHand,
      notes,
      closedBy,
      status,
    } = req.body;

    // Validate required fields
    if (!closingDate) {
      return res.status(400).json({
        status: "error",
        message: "Closing date is required"
      });
    }

    if (openingCash === undefined || openingCash === null) {
      return res.status(400).json({
        status: "error",
        message: "Opening cash is required"
      });
    }

    if (totalSales === undefined || totalSales === null) {
      return res.status(400).json({
        status: "error",
        message: "Total sales is required"
      });
    }

    if (totalExpenses === undefined || totalExpenses === null) {
      return res.status(400).json({
        status: "error",
        message: "Total expenses is required"
      });
    }

    if (cashInHand === undefined || cashInHand === null) {
      return res.status(400).json({
        status: "error",
        message: "Cash in hand is required"
      });
    }

    if (!closedBy) {
      return res.status(400).json({
        status: "error",
        message: "Closed by is required"
      });
    }

    // Calculate expected cash and difference
    const expectedCash = openingCash + totalSales - totalExpenses;
    const difference = cashInHand - expectedCash;

    const storeClosingData = {
      closingDate,
      openingCash,
      totalSales,
      totalExpenses,
      cashInHand,
      expectedCash,
      difference,
      notes: notes || '',
      closedBy,
      status: status || 'Closed',
    };

    const data = await StoreClosing.create(storeClosingData);
    
    return res.status(200).json({
      status: "ok",
      message: "Store closing created successfully",
      data: data
    });
  } catch (err) {
    console.error('Error creating store closing:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

// Get all store closings
const getStoreClosings = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let from = req.query.from;
    let to = req.query.to;
    const limit = parseInt(req.query.limit) || 20;

    // Create base query
    let baseQuery = {};

    // Date range filter
    if (from && to) {
      baseQuery.closingDate = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    // Search filter (search by closed by name)
    if (search) {
      // This will search in populated closedBy field
      baseQuery['$or'] = [
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const data = await StoreClosing.find(baseQuery)
      .populate({
        path: 'closedBy',
        select: 'name email'
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await StoreClosing.countDocuments(baseQuery);

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
    console.error('Error fetching store closings:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

// Get store closing by id
const getStoreClosingById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await StoreClosing.findById(id)
      .populate({
        path: 'closedBy',
        select: 'name email'
      });
    
    if (!data) {
      return res.status(404).json({
        status: "error",
        message: "Store closing not found"
      });
    }
    
    return res.status(200).json({
      status: "ok",
      data: data
    });
  } catch (err) {
    console.error('Error fetching store closing:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

// Update store closing
const updateStoreClosing = async (req, res) => {
  try {
    const id = req.params.id;
    
    const existingClosing = await StoreClosing.findById(id);
    if (!existingClosing) {
      return res.status(404).json({
        status: "error",
        message: "Store closing not found"
      });
    }

    const data = await StoreClosing.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate({
      path: 'closedBy',
      select: 'name email'
    });
    
    return res.status(200).json({
      status: "ok",
      message: "Store closing updated successfully",
      data: data
    });
  } catch (err) {
    console.error('Error updating store closing:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

// Delete store closing
const deleteStoreClosing = async (req, res) => {
  try {
    const id = req.params.id;
    
    const existingClosing = await StoreClosing.findById(id);
    if (!existingClosing) {
      return res.status(404).json({
        status: "error",
        message: "Store closing not found"
      });
    }

    await StoreClosing.findByIdAndDelete(id);
    
    return res.status(200).json({
      status: "ok",
      message: "Store closing deleted successfully"
    });
  } catch (err) {
    console.error('Error deleting store closing:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

module.exports = {
  createStoreClosing,
  getStoreClosings,
  getStoreClosingById,
  updateStoreClosing,
  deleteStoreClosing,
};
