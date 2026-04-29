const PharmReturnStock = require("../models/pharmReturnStockModel");
const PharmInboundStock = require("../models/pharmInboundStockModel");
const PharmSupplier = require("../models/pharmSupplierModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible } = require("../utils/branchScope");

// 1. Create pharmReturnStock
const addpharmReturnStock = async (req, res) => {
  try {
    const data = await PharmReturnStock.create(
      assignBranchIdForCreate(req, {
        ...req.body,
        createdBy: req.user?._id || req.body.createdBy,
      })
    );
    
    // NOTE: The stock deduction logic is handled by the pre-save hook in the PharmReturnStock model.
    // We should NOT duplicate it here to avoid double deduction.

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

    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(baseQuery, branchQ);

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
    if (!data || !(await branchDocumentVisible(req, data.branchId))) {
      return res.status(404).json({ status: "fail", message: "Return record not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmReturnStock
const updatepharmReturnStock = async (req, res) => {
  try {
    let id = req.params.id;
    // NOTE: The pre 'findOneAndUpdate' hook in the model handles:
    // 1. Reverting old stock
    // 2. Validating new stock
    // 3. Applying new stock deduction
    
    // So we just need to pass the update.
    
    const existing = await PharmReturnStock.findById(id);
    if (!existing || !(await branchDocumentVisible(req, existing.branchId))) {
      return res.status(404).json({ error: "Return record not found" });
    }

    const data = await PharmReturnStock.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true } // Ensure validators run
    );

    if (!data) {
      return res.status(404).json({ error: "Return record not found" });
    }

    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmReturnStock
const deletepharmReturnStock = async (req, res) => {
  try {
    const id = req.params.id;
    const row = await PharmReturnStock.findById(id);
    if (!row || !(await branchDocumentVisible(req, row.branchId))) {
      return res.status(404).json({ status: "fail", message: "Return record not found" });
    }
    await PharmReturnStock.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Pharmacy Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Get invoices (Inbound Stock) for a supplier
const getSupplierInvoices = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const sup = await PharmSupplier.findById(supplierId).lean();
    if (!sup || !(await branchDocumentVisible(req, sup.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }

    const query = { supplierId };
    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(query, branchQ);
    if (search) {
      query.$or = [
        { documentNumber: { $regex: search, $options: "i" } },
        { supplierInvoiceNumber: { $regex: search, $options: "i" } }
      ];
    }

    const invoices = await PharmInboundStock.find(query)
      .select("documentNumber supplierInvoiceNumber date grandTotal items")
      .populate("items.pharmItemId", "name availableQuantity unitCost")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const count = await PharmInboundStock.countDocuments(query);

    return res.status(200).json({
      status: "ok",
      data: invoices,
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

const getNextReturnNumber = async (req, res) => {
  try {
    const branchQ = await mergeBranchScopedQuery(req);
    const lastRecord = await PharmReturnStock.findOne(branchQ || {}).sort({ returnNumber: -1 });
    let nextNum = 1;
    if (lastRecord && lastRecord.returnNumber) {
      const lastNumStr = lastRecord.returnNumber.replace('SR-', '');
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    const nextNumber = `SR-${String(nextNum).padStart(6, '0')}`;
    res.status(200).json({ status: "ok", data: nextNumber });
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
  getSupplierInvoices,
  getNextReturnNumber
};
