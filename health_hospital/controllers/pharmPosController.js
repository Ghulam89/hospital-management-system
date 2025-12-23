const PharmPos = require("../models/pharmPosModel");

// 1. Create pharmPos
const addpharmPos = async (req, res) => {
  try {
    console.log('Creating POS invoice with data:', req.body);
    
    // Auto-generate invoice number if not provided
    if (!req.body.invoiceNumber) {
      const count = await PharmPos.countDocuments();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
      req.body.invoiceNumber = invoiceNumber;
    }
    
    const data = await PharmPos.create(req.body);
    
    console.log('POS invoice created successfully:', data._id);
    
    return res.status(200).json({ 
      status: "ok", 
      message: "POS transaction completed successfully",
      data: data 
    });
    
  } catch (err) {
    console.error('Error creating POS invoice:', err);
    
    // Return detailed error message
    const errorMessage = err.message || 'Failed to create POS invoice';
    
    return res.status(500).json({ 
      status: "error",
      error: errorMessage,
      message: errorMessage
    });
  }
};



const getpharmPoss = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const sort = req.query.sort || '-createdAt';

    const baseQuery = {};

    // Search filter
    if (search) {
      baseQuery.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { doctorName: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } }
      ];
    }

    // Optional filters
    if (req.query.patientId) {
      baseQuery.patientId = req.query.patientId;
    }

    if (req.query.referId) {
      baseQuery.referId = req.query.referId;
    }

    // Date range filter
    if (req.query.from || req.query.to) {
      baseQuery.createdAt = {};
      if (req.query.from) {
        baseQuery.createdAt.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        // Add one day to include the entire 'to' date
        const toDate = new Date(req.query.to);
        toDate.setDate(toDate.getDate() + 1);
        baseQuery.createdAt.$lte = toDate;
      }
    }

    // Fetch paginated data
    const data = await PharmPos.find(baseQuery)
      .populate(['patientId', 'referId', 'createdBy'])
      .populate({
        path: 'allItem.pharmItemId',
        populate: [
          { path: 'pharmManufacturerId' },
          { path: 'pharmSupplierId' },
          { path: 'pharmCategoryId' }
        ]
      })
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmPos.countDocuments(baseQuery);

    // Summary is now available from separate /summary endpoint
    return res.status(200).json({
      status: "ok",
      data: data,
      search,
      page,
      total: count,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit
    });
  } catch (err) {
    console.error('Error fetching POS transactions:', err);
    res.status(500).json({ error: err.message });
  }
};

// 3. Get pharmPos by id
const getpharmPosById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmPos.findById(id)
      .populate(['patientId', 'referId'])
      .populate({
        path: 'allItem.pharmItemId',
        populate: [
          { path: 'pharmManufacturerId' },
          { path: 'pharmSupplierId' },
          { path: 'pharmCategoryId' }
        ]
      });
      
    if (!data) {
      return res.status(404).json({ 
        status: "error", 
        message: "POS transaction not found" 
      });
    }
    
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    console.error('Error fetching POS transaction:', err);
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmPos
const updatepharmPos = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Clean the request body
    const cleanedBody = {};
    for (const key in req.body) {
      if (req.body[key] !== null && req.body[key] !== undefined && req.body[key] !== '') {
        cleanedBody[key] = req.body[key];
      }
    }

    const data = await PharmPos.findByIdAndUpdate(
      id,
      cleanedBody,
      { new: true }
    )
    .populate(['patientId', 'referId'])
    .populate({
      path: 'allItem.pharmItemId',
      populate: [
        { path: 'pharmManufacturerId' },
        { path: 'pharmSupplierId' },
        { path: 'pharmCategoryId' }
      ]
    });
    
    if (!data) {
      return res.status(404).json({ 
        status: "error", 
        message: "POS transaction not found" 
      });
    }
    
    console.log('POS transaction updated:', id);
    return res.status(200).json({ 
      status: "ok", 
      data: data,
      message: "POS transaction updated successfully"
    });
  } catch (err) {
    console.error('Error updating POS transaction:', err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmPos
const deletepharmPos = async (req, res) => {
  try {
    const id = req.params.id;
    
    const data = await PharmPos.findByIdAndDelete(id);
    
    if (!data) {
      return res.status(404).json({ 
        status: "error", 
        message: "POS transaction not found" 
      });
    }
    
    console.log('POS transaction deleted:', id);
    return res.status(200).json({ 
      status: "ok", 
      message: "POS transaction deleted successfully" 
    });
  } catch (err) {
    console.error('Error deleting POS transaction:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get POS Summary/Statistics (Separate API)
const getpharmPosSummary = async (req, res) => {
  try {
    const baseQuery = {};

    // Search filter
    if (req.query.search) {
      baseQuery.$or = [
        { invoiceNumber: { $regex: req.query.search, $options: 'i' } },
        { patientName: { $regex: req.query.search, $options: 'i' } },
        { doctorName: { $regex: req.query.search, $options: 'i' } },
        { note: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Optional filters
    if (req.query.patientId) {
      baseQuery.patientId = req.query.patientId;
    }

    if (req.query.referId) {
      baseQuery.referId = req.query.referId;
    }

    // Date range filter
    if (req.query.from || req.query.to) {
      baseQuery.createdAt = {};
      if (req.query.from) {
        baseQuery.createdAt.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setDate(toDate.getDate() + 1);
        baseQuery.createdAt.$lte = toDate;
      }
    }

    console.log('📊 Calculating POS summary with filters:', baseQuery);

    // Calculate summary using aggregation
    const summaryStats = await PharmPos.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSales: { $sum: { $add: ['$paid', '$due'] } },
          totalPaid: { $sum: '$paid' },
          totalDue: { $sum: '$due' },
          totalDiscount: { $sum: '$totalDiscount' },
          totalTax: { $sum: '$totalTax' },
          totalAdvance: { $sum: '$advance' }
        }
      }
    ]);

    const summary = summaryStats.length > 0 ? summaryStats[0] : {
      totalTransactions: 0,
      totalSales: 0,
      totalPaid: 0,
      totalDue: 0,
      totalDiscount: 0,
      totalTax: 0,
      totalAdvance: 0
    };

    console.log('✅ Summary calculated:', summary);

    return res.status(200).json({
      status: "ok",
      summary: {
        totalTransactions: summary.totalTransactions || 0,
        totalSales: summary.totalSales || 0,
        totalPaid: summary.totalPaid || 0,
        totalDue: summary.totalDue || 0,
        totalDiscount: summary.totalDiscount || 0,
        totalTax: summary.totalTax || 0,
        totalAdvance: summary.totalAdvance || 0
      }
    });
  } catch (err) {
    console.error('Error calculating POS summary:', err);
    res.status(500).json({ 
      status: "error",
      error: err.message 
    });
  }
};

module.exports = {
  addpharmPos,
  getpharmPoss,
  getpharmPosById,
  updatepharmPos,
  deletepharmPos,
  getpharmPosSummary,

};
