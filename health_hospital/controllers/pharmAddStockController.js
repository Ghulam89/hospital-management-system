const PharmAddStock = require("../models/pharmAddStockModel");
const PharmInboundStock = require("../models/pharmInboundStockModel");

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
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate || null,
        rack: item.rack || null
      })),
      totalCost: totalCost || 0,
      totalTax: totalTax || 0,
      grandTotal: grandTotal || 0,
      remarks: remarks || '',
      status: 'completed'
    };

    const createdInboundStock = await PharmInboundStock.create(inboundStockData);

    return res.status(200).json({ 
      status: "ok", 
      message: "Stock added successfully",
      data: createdInboundStock 
    });
    
  } catch (err) {
    console.error('Error adding stock:', err);
    res.status(500).json({ 
      status: "error",
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
        select: 'name manufacturer b2bCategory conversionUnit unit unitCost retailPrice'
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
        select: 'name manufacturer b2bCategory conversionUnit unit unitCost retailPrice'
      });
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmAddStock
const updatepharmAddStock = async (req, res) => {
  try {
    let id = req.params.id;
    
    // Note: Updating inbound stock should be done carefully as it affects inventory
    // For now, we'll allow basic field updates but not item changes
    const updateData = {
      supplierInvoiceDate: req.body.supplierInvoiceDate,
      supplierInvoiceNumber: req.body.supplierInvoiceNumber,
      remarks: req.body.remarks,
      status: req.body.status
    };

    const data = await PharmInboundStock.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
    .populate({
      path: 'supplierId',
      select: 'name phone email address'
    })
    .populate({
      path: 'items.pharmItemId',
      select: 'name manufacturer b2bCategory conversionUnit unit unitCost retailPrice'
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

module.exports = {
  addpharmAddStock,
  getpharmAddStocks,
  getpharmAddStockById,
  updatepharmAddStock,
  deletepharmAddStock,

};
