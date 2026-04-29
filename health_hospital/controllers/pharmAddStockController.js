const PharmAddStock = require("../models/pharmAddStockModel");
const PharmInboundStock = require("../models/pharmInboundStockModel");
const PharmItem = require("../models/pharmItemModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible } = require("../utils/branchScope");

// 1. Create pharmAddStock (Inbound Stock Document)
const addpharmAddStock = async (req, res) => {
  try {
    const { 
      documentNumber, 
      date, 
      supplierId, 
      supplierInvoiceDate, 
      supplierInvoiceNumber, 
      items, 
      totalCost, 
      totalTax, 
      grandTotal, 
      remarks 
    } = req.body;
    
    // Check if items array exists and has data
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        status: "error", 
        message: "No items provided" 
      });
    }

    // Check if supplierId is provided
    if (!supplierId) {
      return res.status(400).json({ 
        status: "error", 
        message: "Supplier ID is required" 
      });
    }

    // Create the inbound stock document
    const inboundStockData = {
      documentNumber: documentNumber || undefined,
      date: date || new Date(),
      supplierId,
      supplierInvoiceDate: supplierInvoiceDate || null,
      supplierInvoiceNumber: supplierInvoiceNumber || null,
      items: items.map(item => ({
        pharmItemId: item.pharmItemId,
        quantity: item.quantity || 0,
        looseUnitQty: item.looseUnitQty || 0,
        unitCost: item.unitCost || 0,
        totalCost: item.totalCost || 0,
        itemTax: item.itemTax || 0,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate || null,
        rack: item.rack || null
      })),
      totalCost: totalCost || 0,
      totalTax: totalTax || 0,
      grandTotal: grandTotal || 0,
      paid: 0,
      due: Number(grandTotal) || 0,
      payment: [],
      remarks: remarks || '',
      status: 'completed'
    };

    const createdInboundStock = await PharmInboundStock.create(assignBranchIdForCreate(req, inboundStockData));

    return res.status(200).json({ 
      status: "ok", 
      message: "Stock added successfully",
      data: createdInboundStock 
    });
    
  } catch (err) {
    console.error('Error adding stock:', err);
    const errorMessage = err.message || 'Failed to add stock';
    return res.status(500).json({ 
      status: "error",
      message: errorMessage,
      error: err.message 
    });
  }
};



const getpharmAddStocks = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let supplierFilter = req.query.supplierId || "";
    let manufacturerFilter = req.query.manufacturerId || "";
    let from = req.query.from;
    let to = req.query.to;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    // Create base query
    const baseQuery = {};

    // Date range filter
    if (from && to) {
      baseQuery.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    // Supplier filter
    if (supplierFilter) {
      baseQuery.supplierId = supplierFilter;
    }

    // Search filter (search by document number or supplier invoice number)
    if (search) {
      baseQuery.$or = [
        { documentNumber: { $regex: search, $options: 'i' } },
        { supplierInvoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch data with populated fields
    const data = await PharmInboundStock.find(baseQuery)
      .populate({
        path: 'supplierId',
        select: 'name phone email address'
      })
      .populate({
        path: 'items.pharmItemId',
        select: 'name conversionUnit unit unitCost retailPrice availableQuantity pharmManufacturerId pharmCategoryId pharmRackId',
        populate: [
          { path: 'pharmManufacturerId', select: 'name' },
          { path: 'pharmCategoryId', select: 'name' },
          { path: 'pharmRackId', select: 'name' },
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmInboundStock.countDocuments(baseQuery);

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

// 3. Get pharmAddStock by id
const getpharmAddStockById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmInboundStock.findById(id)
      .populate({
        path: 'supplierId',
        select: 'name phone email address'
      })
      .populate({
        path: 'items.pharmItemId',
        select: 'name conversionUnit unit unitCost retailPrice availableQuantity pharmManufacturerId pharmCategoryId pharmRackId',
        populate: [
          { path: 'pharmManufacturerId', select: 'name' },
          { path: 'pharmCategoryId', select: 'name' },
          { path: 'pharmRackId', select: 'name' },
        ]
      });
    if (!data || !(await branchDocumentVisible(req, data.branchId))) {
      return res.status(404).json({ status: "fail", message: "Inbound stock not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmAddStock
const updatepharmAddStock = async (req, res) => {
  try {
    let id = req.params.id;
    const doc = await PharmInboundStock.findById(id);
    if (!doc || !(await branchDocumentVisible(req, doc.branchId))) {
      return res.status(404).json({ status: "error", message: "Inbound stock not found" });
    }

    const normalizeItems = (items) => {
      if (!Array.isArray(items)) return [];
      return items
        .filter((it) => it && it.pharmItemId)
        .map((it) => ({
          pharmItemId: it.pharmItemId,
          quantity: Number(it.quantity) || 0,
          looseUnitQty: Number(it.looseUnitQty) || 0,
          unitCost: Number(it.unitCost) || 0,
          totalCost: Number(it.totalCost) || 0,
          itemTax: Number(it.itemTax) || 0,
          batchNumber: it.batchNumber || null,
          expiryDate: it.expiryDate || null,
          rack: it.rack || null,
        }));
    };

    const incomingStatus = req.body.status ?? doc.status ?? "completed";
    const shouldApplyInventory = incomingStatus !== "cancelled";
    const currentlyAppliedInventory = (doc.status ?? "completed") !== "cancelled";
    const inventoryNeedsUpdate =
      Array.isArray(req.body.items) || incomingStatus !== (doc.status ?? "completed");

    const incomingItems = Array.isArray(req.body.items) ? normalizeItems(req.body.items) : null;
    const finalItems = incomingItems || normalizeItems(doc.items);

    const oldItemIds = normalizeItems(doc.items).map((it) => String(it.pharmItemId));
    const newItemIds = finalItems.map((it) => String(it.pharmItemId));
    const allItemIds = Array.from(new Set([...oldItemIds, ...newItemIds])).filter(Boolean);

    const pharmItems = allItemIds.length
      ? await PharmItem.find({ _id: { $in: allItemIds } }).select("_id conversionUnit")
      : [];
    const conversionById = new Map(pharmItems.map((p) => [String(p._id), Number(p.conversionUnit) || 1]));

    const toUnits = (it) => {
      const conv = conversionById.get(String(it.pharmItemId)) || 1;
      const packs = Number(it.quantity) || 0;
      const loose = Number(it.looseUnitQty) || 0;
      return packs * conv + loose;
    };

    if (inventoryNeedsUpdate && currentlyAppliedInventory) {
      const oldItems = normalizeItems(doc.items);
      await Promise.all(
        oldItems.map(async (it) => {
          const units = toUnits(it);
          if (!units) return;
          const itemDoc = await PharmItem.findById(it.pharmItemId);
          if (!itemDoc) return;
          itemDoc.availableQuantity = Math.max(0, (Number(itemDoc.availableQuantity) || 0) - units);
          await itemDoc.save();
        })
      );
    }

    if (inventoryNeedsUpdate && shouldApplyInventory) {
      await Promise.all(
        finalItems.map(async (it) => {
          const units = toUnits(it);
          if (!units) return;
          const itemDoc = await PharmItem.findById(it.pharmItemId);
          if (!itemDoc) return;
          itemDoc.availableQuantity = (Number(itemDoc.availableQuantity) || 0) + units;
          await itemDoc.save();
        })
      );
    }

    if (req.body.documentNumber !== undefined) doc.documentNumber = req.body.documentNumber;
    if (req.body.date !== undefined) doc.date = req.body.date;
    if (req.body.supplierId !== undefined) doc.supplierId = req.body.supplierId;
    if (req.body.supplierInvoiceDate !== undefined) doc.supplierInvoiceDate = req.body.supplierInvoiceDate;
    if (req.body.supplierInvoiceNumber !== undefined) doc.supplierInvoiceNumber = req.body.supplierInvoiceNumber;
    if (req.body.totalCost !== undefined) doc.totalCost = req.body.totalCost;
    if (req.body.totalTax !== undefined) doc.totalTax = req.body.totalTax;
    if (req.body.grandTotal !== undefined) doc.grandTotal = req.body.grandTotal;
    if (req.body.remarks !== undefined) doc.remarks = req.body.remarks;
    doc.status = incomingStatus;

    if (incomingItems) {
      doc.items = finalItems;
    }

    const paidFromPayments = Array.isArray(doc.payment)
      ? doc.payment.reduce((sum, p) => sum + (Number(p?.paid) || 0), 0)
      : 0;
    doc.paid = paidFromPayments;
    doc.due = (Number(doc.grandTotal) || 0) - paidFromPayments;

    await doc.save();

    const data = await PharmInboundStock.findById(id)
      .populate({
        path: "supplierId",
        select: "name phone email address",
      })
      .populate({
        path: "items.pharmItemId",
        select: "name conversionUnit unit unitCost retailPrice availableQuantity pharmManufacturerId pharmCategoryId pharmRackId",
        populate: [
          { path: "pharmManufacturerId", select: "name" },
          { path: "pharmCategoryId", select: "name" },
          { path: "pharmRackId", select: "name" },
        ],
      });

    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmAddStock
const deletepharmAddStock = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmInboundStock.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Inbound stock document deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAddStockByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const supplierId = req.query.supplier;
    const minAmount = req.query.minAmount;
    const maxAmount = req.query.maxAmount;

    const query = { "items.pharmItemId": itemId };

    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(query, branchQ);

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (supplierId) {
      query.supplierId = supplierId;
    }

    if (minAmount || maxAmount) {
      query["items"] = { 
        $elemMatch: { 
          pharmItemId: itemId,
          totalCost: {} 
        } 
      };
      if (minAmount) query["items"].$elemMatch.totalCost.$gte = Number(minAmount);
      if (maxAmount) query["items"].$elemMatch.totalCost.$lte = Number(maxAmount);
    }

    if (search) {
      query.$or = [
        { documentNumber: { $regex: search, $options: "i" } },
        { supplierInvoiceNumber: { $regex: search, $options: "i" } }
      ];
    }

    const total = await PharmInboundStock.countDocuments(query);
    const data = await PharmInboundStock.find(query)
      .populate('supplierId', 'name')
      .populate({
        path: 'items.pharmItemId',
        select: 'name'
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      status: "ok",
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpharmAddStock,
  getpharmAddStocks,
  getpharmAddStockById,
  updatepharmAddStock,
  deletepharmAddStock,
  getAddStockByItem
};
