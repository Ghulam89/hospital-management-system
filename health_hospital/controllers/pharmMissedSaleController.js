const PharmMissedSale = require("../models/pharmMissedSaleModel");

// 1. Create Missed Sale
const addMissedSale = async (req, res) => {
  try {
    console.log('Creating missed sale with data:', req.body);
    
    // Clean the request body
    const cleanedBody = {};
    for (const key in req.body) {
      if (req.body[key] !== null && req.body[key] !== undefined && req.body[key] !== '') {
        cleanedBody[key] = req.body[key];
      }
    }
    
    // Ensure required fields
    if (!cleanedBody.pharmItemId) {
      return res.status(400).json({ error: 'pharmItemId is required' });
    }
    if (!cleanedBody.quantity) {
      return res.status(400).json({ error: 'quantity is required' });
    }
    if (!cleanedBody.reason) {
      return res.status(400).json({ error: 'reason is required' });
    }
    
    // Format dates
    if (cleanedBody.missedDate) {
      cleanedBody.missedDate = new Date(cleanedBody.missedDate);
    }
    
    const data = await PharmMissedSale.create(cleanedBody);
    console.log('Missed sale created successfully:', data._id);
    
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    console.error('Error creating missed sale:', err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Get Missed Sales
const getMissedSales = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const baseQuery = {};

    // Optional filters
    if (req.query.status) {
      baseQuery.status = req.query.status;
    }

    if (req.query.reason) {
      baseQuery.reason = req.query.reason;
    }

    // Filter by missedDate date range
    if (req.query.from || req.query.to) {
      baseQuery.missedDate = {};
      if (req.query.from) {
        baseQuery.missedDate.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        baseQuery.missedDate.$lte = new Date(req.query.to);
      }
    }

    // Search by item name or reason (case-insensitive)
    if (search) {
      baseQuery.$or = [
        { reason: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } }
      ];
    }

    const data = await PharmMissedSale.find(baseQuery)
      .populate(['pharmItemId', 'createdBy', 'resolvedBy'])
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmMissedSale.countDocuments(baseQuery);

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

// 3. Get Missed Sale by ID
const getMissedSaleById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmMissedSale.findById(id)
      .populate(['pharmItemId', 'createdBy', 'resolvedBy']);
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update Missed Sale
const updateMissedSale = async (req, res) => {
  try {
    let id = req.params.id;
    const data = await PharmMissedSale.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    ).populate(['pharmItemId', 'createdBy', 'resolvedBy']);
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete Missed Sale
const deleteMissedSale = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmMissedSale.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Missed sale deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Resolve Missed Sale
const resolveMissedSale = async (req, res) => {
  try {
    const id = req.params.id;
    const { resolvedBy, resolution } = req.body;
    
    const data = await PharmMissedSale.findByIdAndUpdate(
      id,
      { 
        status: 'Resolved',
        resolvedBy: resolvedBy,
        resolvedAt: new Date(),
        notes: resolution
      },
      { new: true }
    ).populate(['pharmItemId', 'createdBy', 'resolvedBy']);
    
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. Get Missed Sale Statistics
const getMissedSaleStats = async (req, res) => {
  try {
    const totalMissedSales = await PharmMissedSale.countDocuments();
    const pendingMissedSales = await PharmMissedSale.countDocuments({ status: 'Pending' });
    const resolvedMissedSales = await PharmMissedSale.countDocuments({ status: 'Resolved' });
    
    const totalLoss = await PharmMissedSale.aggregate([
      { $group: { _id: null, total: { $sum: "$estimatedLoss" } } }
    ]);

    const reasonStats = await PharmMissedSale.aggregate([
      { $group: { _id: "$reason", count: { $sum: 1 }, totalLoss: { $sum: "$estimatedLoss" } } },
      { $sort: { count: -1 } }
    ]);

    return res.status(200).json({
      status: "ok",
      data: {
        totalMissedSales,
        pendingMissedSales,
        resolvedMissedSales,
        totalLoss: totalLoss[0]?.total || 0,
        reasonStats
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addMissedSale,
  getMissedSales,
  getMissedSaleById,
  updateMissedSale,
  deleteMissedSale,
  resolveMissedSale,
  getMissedSaleStats
};