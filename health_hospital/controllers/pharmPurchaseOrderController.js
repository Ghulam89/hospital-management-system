const PharmPurchaseOrder = require("../models/pharmPurchaseOrderModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible } = require("../utils/branchScope");

// 1. Create Purchase Order
const addPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, orderDate, expectedDeliveryDate, items, createdBy } = req.body;

    // Validate required fields
    if (!supplierId) {
      return res.status(400).json({ 
        status: "error", 
        message: "Supplier is required" 
      });
    }

    if (!orderDate) {
      return res.status(400).json({ 
        status: "error", 
        message: "Order date is required" 
      });
    }

    if (!expectedDeliveryDate) {
      return res.status(400).json({ 
        status: "error", 
        message: "Expected delivery date is required" 
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        status: "error", 
        message: "At least one item is required" 
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.pharmItemId) {
        return res.status(400).json({ 
          status: "error", 
          message: "Item ID is required for all items" 
        });
      }
      if (!item.unitsRequired || item.unitsRequired <= 0) {
        return res.status(400).json({ 
          status: "error", 
          message: "Units required must be greater than 0" 
        });
      }
    }

    // Generate purchase order number (per branch when scoped)
    const branchQ = await mergeBranchScopedQuery(req);
    const count = await PharmPurchaseOrder.countDocuments(branchQ || {});
    const purchaseOrderNumber = `PO${String(count + 1).padStart(6, "0")}`;

    // Prepare data for creation
    const purchaseOrderData = {
      purchaseOrderNumber: purchaseOrderNumber,
      supplierId: req.body.supplierId,
      orderDate: req.body.orderDate,
      expectedDeliveryDate: req.body.expectedDeliveryDate,
      projectDays: req.body.projectDays || 0,
      zeroQuantity: req.body.zeroQuantity === 'Yes' || req.body.zeroQuantity === true,
      poCategory: req.body.poCategory || 'Projection Period',
      unit: req.body.unit || 'Pack',
      items: items.map(item => ({
        pharmItemId: item.pharmItemId,
        manufacturerName: item.manufacturerName || '',
        b2bCategory: item.b2bCategory || '',
        conversionUnit: item.conversionUnit || 1,
        currentStock: item.currentStock || 0,
        soldQuantity: item.soldQuantity || 0,
        avgSaleQuantity: item.avgSaleQuantity || 0,
        projectedSales: item.projectedSales || 0,
        unitsRequired: item.unitsRequired,
        unitCost: item.unitCost || 0,
        totalCost: item.totalCost || (item.unitsRequired * (item.unitCost || 0))
      })),
      notes: req.body.notes || '',
      createdBy: createdBy || '65a1f1a1a1a1a1a1a1a1a1a1' // Fallback user ID
    };

    const data = await PharmPurchaseOrder.create(assignBranchIdForCreate(req, purchaseOrderData));
    return res.status(200).json({ 
      status: "ok", 
      message: "Purchase order created successfully",
      data: data 
    });
  } catch (err) {
    console.error('Error creating purchase order:', err);
    res.status(500).json({ 
      status: "error",
      error: err.message 
    });
  }
};

// 2. Get Purchase Orders
const getPurchaseOrders = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const baseQuery = {};

    const branchQList = await mergeBranchScopedQuery(req);
    if (branchQList) Object.assign(baseQuery, branchQList);

    // Optional filters
    if (req.query.supplierId) {
      const sid = req.query.supplierId;
      try {
        const objId = require('mongoose').Types.ObjectId.isValid(sid)
          ? new (require('mongoose').Types.ObjectId)(sid)
          : sid;
        baseQuery.supplierId = objId;
      } catch {
        baseQuery.supplierId = sid;
      }
    }

    if (req.query.status) {
      baseQuery.status = req.query.status;
    }

    if (req.query.poCategory) {
      baseQuery.poCategory = req.query.poCategory;
    }

    // Filter by orderDate date range
    if (req.query.from || req.query.to) {
      baseQuery.orderDate = {};
      if (req.query.from) {
        baseQuery.orderDate.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        baseQuery.orderDate.$lte = new Date(req.query.to);
      }
    }

    // Search by purchase order number (case-insensitive)
    if (search) {
      baseQuery.purchaseOrderNumber = { $regex: search, $options: "i" };
    }

    const data = await PharmPurchaseOrder.find(baseQuery)
      .populate(['supplierId', 'createdBy', 'approvedBy'])
      .populate({
        path: 'items.pharmItemId',
        populate: [
          { path: 'pharmManufacturerId' },
          { path: 'pharmSupplierId' },
          { path: 'pharmCategoryId' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmPurchaseOrder.countDocuments(baseQuery);

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

// 3. Get Purchase Order by ID
const getPurchaseOrderById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmPurchaseOrder.findById(id)
      .populate(['supplierId', 'createdBy', 'approvedBy'])
      .populate({
        path: 'items.pharmItemId',
        populate: [
          { path: 'pharmManufacturerId' },
          { path: 'pharmSupplierId' },
          { path: 'pharmCategoryId' }
        ]
      });
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update Purchase Order
const updatePurchaseOrder = async (req, res) => {
  try {
    let id = req.params.id;
    const existing = await PharmPurchaseOrder.findById(id);
    if (!existing || !(await branchDocumentVisible(req, existing.branchId))) {
      return res.status(404).json({ status: "fail", message: "Purchase order not found" });
    }
    const data = await PharmPurchaseOrder.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    ).populate(['supplierId', 'createdBy', 'approvedBy'])
     .populate({
       path: 'items.pharmItemId',
       populate: [
         { path: 'pharmManufacturerId' },
         { path: 'pharmSupplierId' },
         { path: 'pharmCategoryId' }
       ]
     });
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete Purchase Order
const deletePurchaseOrder = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmPurchaseOrder.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Purchase Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Approve Purchase Order
const approvePurchaseOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const { approvedBy } = req.body;

    const existing = await PharmPurchaseOrder.findById(id);
    if (!existing || !(await branchDocumentVisible(req, existing.branchId))) {
      return res.status(404).json({ status: "fail", message: "Purchase order not found" });
    }

    const data = await PharmPurchaseOrder.findByIdAndUpdate(
      id,
      { 
        status: 'Approved',
        approvedBy: approvedBy,
        approvedAt: new Date()
      },
      { new: true }
    ).populate(['supplierId', 'createdBy', 'approvedBy'])
     .populate({
       path: 'items.pharmItemId',
       populate: [
         { path: 'pharmManufacturerId' },
         { path: 'pharmSupplierId' },
         { path: 'pharmCategoryId' }
       ]
     });
    
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. Get Purchase Order Statistics
const getPurchaseOrderStats = async (req, res) => {
  try {
    const totalOrders = await PharmPurchaseOrder.countDocuments();
    const pendingOrders = await PharmPurchaseOrder.countDocuments({ status: 'Pending' });
    const approvedOrders = await PharmPurchaseOrder.countDocuments({ status: 'Approved' });
    const deliveredOrders = await PharmPurchaseOrder.countDocuments({ status: 'Delivered' });
    
    const totalAmount = await PharmPurchaseOrder.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    return res.status(200).json({
      status: "ok",
      data: {
        totalOrders,
        pendingOrders,
        approvedOrders,
        deliveredOrders,
        totalAmount: totalAmount[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8. Get Next Purchase Order Number
const getNextPONumber = async (req, res) => {
  try {
    const branchQ = await mergeBranchScopedQuery(req);
    const lastOrder = await PharmPurchaseOrder.findOne(branchQ || {}, { purchaseOrderNumber: 1 }).sort({
      createdAt: -1,
    });
    let newOrderNumber = 1;
    
    if (lastOrder && lastOrder.purchaseOrderNumber) {
      const lastNumber = parseInt(lastOrder.purchaseOrderNumber.replace('PO', ''));
      if (!isNaN(lastNumber)) {
        newOrderNumber = lastNumber + 1;
      }
    }
    
    const nextPONumber = `PO${String(newOrderNumber).padStart(6, '0')}`;
    return res.status(200).json({ status: "ok", nextPONumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  approvePurchaseOrder,
  getPurchaseOrderStats,
  getNextPONumber
};
