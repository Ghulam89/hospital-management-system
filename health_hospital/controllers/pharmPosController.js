const PharmPos = require("../models/pharmPosModel");
const PharmItem = require("../models/pharmItemModel");
const PharmInboundStock = require("../models/pharmInboundStockModel");
const PharmReturnStock = require("../models/pharmReturnStockModel");
const Patient = require("../models/patientModel");
const User = require("../models/userModel");
const {
  getScopedPatientIds,
  mergeBranchScopedQuery,
  assignBranchIdForCreate,
} = require("../utils/branchScope");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Atomic counter for invoice numbers per year to avoid duplicates
const getNextInvoiceSequence = async (year) => {
  const coll = PharmPos.db.collection('counters');
  const key = `pharmpos_${year}`;
  // Use driver-compatible option to get updated document across versions
  const result = await coll.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnOriginal: false }
  );
  if (result && result.value && typeof result.value.seq === 'number') {
    return result.value.seq;
  }
  const doc = await coll.findOne({ _id: key });
  return (doc && typeof doc.seq === 'number') ? doc.seq : 1;
};

const buildPharmPosQuery = async (req) => {
  const andConditions = [];

  const search = String(req.query.search || "").trim();
  if (search) {
    andConditions.push({
      $or: [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { patientName: { $regex: search, $options: "i" } },
        { "patientId.name": { $regex: search, $options: "i" } },
        { "patientId.mr": { $regex: search, $options: "i" } },
        { doctorName: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ],
    });
  }

  const invoiceNumber = String(req.query.invoiceNumber || "").trim();
  if (invoiceNumber) {
    andConditions.push({
      invoiceNumber: { $regex: invoiceNumber, $options: "i" },
    });
  }

  if (req.query.patientId) {
    andConditions.push({ patientId: req.query.patientId });
  } else {
    const patientName = String(req.query.patientName || "").trim();
    const patientMr = String(req.query.patientMr || "").trim();

    if (patientName || patientMr) {
      const patientQuery = {};
      if (patientName) patientQuery.name = { $regex: patientName, $options: "i" };
      if (patientMr) patientQuery.mr = { $regex: patientMr, $options: "i" };

      const patientIds = await Patient.find(patientQuery)
        .select("_id")
        .limit(5000)
        .lean();

      andConditions.push({
        patientId: { $in: patientIds.map((p) => p._id) },
      });
    }
  }

  if (req.query.referId) {
    andConditions.push({ referId: req.query.referId });
  } else {
    const doctorName = String(req.query.doctorName || "").trim();
    if (doctorName) {
      const doctorIds = await User.find({ name: { $regex: doctorName, $options: "i" } })
        .select("_id")
        .limit(5000)
        .lean();

      andConditions.push({
        $or: [
          { doctorName: { $regex: doctorName, $options: "i" } },
          { referId: { $in: doctorIds.map((d) => d._id) } },
        ],
      });
    }
  }

  const paymentMethod = String(req.query.paymentMethod || "").trim();
  if (paymentMethod) {
    andConditions.push({
      payment: {
        $elemMatch: {
          method: { $regex: `^${escapeRegex(paymentMethod)}$`, $options: "i" },
        },
      },
    });
  }

  const status = String(req.query.status || "").trim().toLowerCase();
  if (status) {
    if (status === "paid") {
      andConditions.push({ $and: [{ advance: { $eq: 0 } }, { due: { $lte: 0 } }] });
    } else if (status === "pending") {
      andConditions.push({ due: { $gt: 0 } });
    } else if (status === "advance") {
      andConditions.push({ advance: { $gt: 0 } });
    }
  }

  const minAmountRaw = String(req.query.minAmount || "").trim();
  const maxAmountRaw = String(req.query.maxAmount || "").trim();
  const minAmount = minAmountRaw === "" ? null : Number(minAmountRaw);
  const maxAmount = maxAmountRaw === "" ? null : Number(maxAmountRaw);

  if ((minAmount !== null && !Number.isNaN(minAmount)) || (maxAmount !== null && !Number.isNaN(maxAmount))) {
    const totalExpr = {
      $add: [{ $ifNull: ["$paid", 0] }, { $ifNull: ["$due", 0] }],
    };

    const exprConditions = [];
    if (minAmount !== null && !Number.isNaN(minAmount)) {
      exprConditions.push({ $gte: [totalExpr, minAmount] });
    }
    if (maxAmount !== null && !Number.isNaN(maxAmount)) {
      exprConditions.push({ $lte: [totalExpr, maxAmount] });
    }

    if (exprConditions.length === 1) {
      andConditions.push({ $expr: exprConditions[0] });
    } else if (exprConditions.length > 1) {
      andConditions.push({ $expr: { $and: exprConditions } });
    }
  }

  const discountPercentRaw = String(req.query.discountPercent || "").trim();
  const discountPercent = discountPercentRaw === "" ? null : Number(discountPercentRaw);
  if (discountPercent !== null && !Number.isNaN(discountPercent)) {
    const totalExpr = { $add: [{ $ifNull: ["$paid", 0] }, { $ifNull: ["$due", 0] }] };
    const percentExpr = {
      $multiply: [
        {
          $divide: [{ $ifNull: ["$totalDiscount", 0] }, { $cond: [{ $gt: [totalExpr, 0] }, totalExpr, 1] }],
        },
        100,
      ],
    };
    andConditions.push({ $expr: { $gte: [percentExpr, discountPercent] } });
  }

  if (req.query.from || req.query.to) {
    const createdAt = {};
    if (req.query.from) createdAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      toDate.setDate(toDate.getDate() + 1);
      createdAt.$lte = toDate;
    }
    andConditions.push({ createdAt });
  }

  if (req.query.paymentFrom || req.query.paymentTo) {
    const range = {};
    if (req.query.paymentFrom) range.$gte = new Date(req.query.paymentFrom);
    if (req.query.paymentTo) {
      const t = new Date(req.query.paymentTo);
      t.setDate(t.getDate() + 1);
      range.$lte = t;
    }
    andConditions.push({
      payment: {
        $elemMatch: {
          payDate: range,
        },
      },
    });
  }

  const scopedIds = await getScopedPatientIds(req);
  if (scopedIds !== null) {
    if (scopedIds.length === 0) {
      andConditions.push({ _id: { $in: [] } });
    } else {
      const pidEq = andConditions.find((c) => c.patientId && !c.patientId.$in);
      if (pidEq) {
        if (!scopedIds.some((id) => String(id) === String(pidEq.patientId))) {
          andConditions.push({ _id: { $in: [] } });
        }
      } else {
        const pidIn = andConditions.find((c) => c.patientId && c.patientId.$in);
        if (pidIn) {
          const scopeSet = new Set(scopedIds.map(String));
          const next = pidIn.patientId.$in.filter((id) => scopeSet.has(String(id)));
          pidIn.patientId = { $in: next };
          if (next.length === 0) {
            andConditions.push({ _id: { $in: [] } });
          }
        } else {
          andConditions.push({ patientId: { $in: scopedIds } });
        }
      }
    }
  }

  const branchPosQ = await mergeBranchScopedQuery(req);
  if (branchPosQ) {
    andConditions.push(branchPosQ);
  }

  return andConditions.length > 0 ? { $and: andConditions } : {};
};

// 1. Create pharmPos
const addpharmPos = async (req, res) => {
  try {
    console.log('Creating POS invoice with data:', req.body);
    
    // Auto-generate invoice number with atomic yearly counter if not provided
    if (!req.body.invoiceNumber) {
      const year = new Date().getFullYear();
      const maxExistingArr = await PharmPos.aggregate([
        { $match: { invoiceNumber: { $regex: `^INV-${year}-` } } },
        { $project: { seq: { $toInt: { $arrayElemAt: [ { $split: ["$invoiceNumber", "-"] }, 2 ] } } } },
        { $group: { _id: null, maxSeq: { $max: "$seq" } } }
      ]);
      const maxExisting = Array.isArray(maxExistingArr) && maxExistingArr[0] ? (Number(maxExistingArr[0].maxSeq) || 0) : 0;
      const coll = PharmPos.db.collection('counters');
      const key = `pharmpos_${year}`;
      await coll.updateOne({ _id: key }, { $max: { seq: maxExisting } }, { upsert: true });
      let attempts = 0;
      let created = null;
      let lastError = null;
      while (attempts < 20 && !created) {
        attempts += 1;
        const seq = await getNextInvoiceSequence(year);
        const invoiceNumber = `INV-${year}-${String(seq).padStart(6, '0')}`;
        const exists = await PharmPos.exists({ invoiceNumber });
        if (exists) {
          await coll.updateOne({ _id: key }, { $max: { seq: seq } }, { upsert: true });
          continue; // try next sequence
        }
        try {
          const payload = assignBranchIdForCreate(req, { ...req.body, invoiceNumber });
          if (!payload.createdAt) {
            if (Array.isArray(payload.payment) && payload.payment.length > 0 && payload.payment[0].payDate) {
              payload.createdAt = new Date(payload.payment[0].payDate);
            }
          }
          created = await PharmPos.create(payload);
          console.log('POS invoice created successfully:', created._id, invoiceNumber);
          return res.status(200).json({ 
            status: "ok", 
            message: "POS transaction completed successfully",
            data: created 
          });
        } catch (err) {
          lastError = err;
          const msg = String(err && err.message || '').toLowerCase();
          if ((err && err.code === 11000) || (msg.includes('duplicate key') && msg.includes('invoicenumber'))) {
            // Rare race – try next sequence
            await coll.updateOne({ _id: key }, { $max: { seq: seq } }, { upsert: true });
            continue;
          }
          throw err;
        }
      }
      if (!created) {
        throw lastError || new Error('Failed to generate unique invoice number');
      }
    } else {
      // If invoiceNumber provided, still attempt create directly and let unique index enforce
      const data = await PharmPos.create(assignBranchIdForCreate(req, { ...req.body }));
      console.log('POS invoice created successfully with provided number:', data._id, req.body.invoiceNumber);
      return res.status(200).json({ 
        status: "ok", 
        message: "POS transaction completed successfully",
        data: data 
      });
    }
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
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const sort = req.query.sort || '-createdAt';

    const baseQuery = await buildPharmPosQuery(req);

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
      search: String(req.query.search || "").trim(),
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
        path: 'branchId',
        select: 'name address phone location email'
      })
      .populate({
        path: 'createdBy',
        select: 'name branchId',
        populate: {
          path: 'branchId',
          select: 'name address phone location email'
        }
      })
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
    // If this update includes any return items and no explicit createdAt provided,
    // set createdAt to "now" so the return impacts today's closing/reporting.
    if (!cleanedBody.createdAt) {
      const items = Array.isArray(cleanedBody.allItem) ? cleanedBody.allItem : Array.isArray(req.body?.allItem) ? req.body.allItem : [];
      const hasReturn = items.some((it) => it && (it.isReturn === true || Number(it.returnQuantity) > 0));
      if (hasReturn) {
        cleanedBody.createdAt = new Date();
      }
    }
    if (!cleanedBody.createdAt && Array.isArray(cleanedBody.payment) && cleanedBody.payment.length > 0 && cleanedBody.payment[0].payDate) {
      cleanedBody.createdAt = new Date(cleanedBody.payment[0].payDate);
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

// 5. Delete pharmPos (revert stock and recompute availability)
const deletepharmPos = async (req, res) => {
  try {
    const id = req.params.id;
    const pos = await PharmPos.findById(id);
    if (!pos) {
      return res.status(404).json({
        status: "error",
        message: "POS transaction not found",
      });
    }

    // Delete the POS first so aggregates exclude this transaction
    await PharmPos.findByIdAndDelete(id);

    // Recompute availability for affected items using source-of-truth aggregates
    const items = Array.isArray(pos.allItem) ? pos.allItem : [];
    const affectedIds = [...new Set(items.map((it) => String(it?.pharmItemId || ""))).values()];
    for (const pharmItemId of affectedIds) {
      if (!pharmItemId) continue;
      const pharmItem = await PharmItem.findById(pharmItemId);
      if (!pharmItem) continue;

      const conversionUnit = Number(pharmItem.conversionUnit) || 1;
      const itemUnitStr = String(pharmItem.unit || "").toLowerCase();
      const openingUnits =
        itemUnitStr === "pack"
          ? (Number(pharmItem.openingStock) || 0) * conversionUnit
          : Number(pharmItem.openingStock) || 0;

      const inboundUnits = await PharmInboundStock.aggregate([
        { $unwind: "$items" },
        { $match: { "items.pharmItemId": pharmItem._id } },
        {
          $group: {
            _id: null,
            u: {
              $sum: {
                $add: [
                  { $multiply: [{ $ifNull: ["$items.quantity", 0] }, conversionUnit] },
                  { $ifNull: ["$items.looseUnitQty", 0] }
                ]
              }
            }
          }
        }
      ]);
      const inboundSum = Array.isArray(inboundUnits) && inboundUnits[0] ? Number(inboundUnits[0].u) || 0 : 0;

      const salesUnits = await PharmPos.aggregate([
        { $unwind: "$allItem" },
        { $match: { "allItem.pharmItemId": pharmItem._id, "allItem.isReturn": { $ne: true } } },
        {
          $group: {
            _id: null,
            u: {
              $sum: {
                $cond: [
                  { $eq: [{ $toLower: "$allItem.unit" }, "pack"] },
                  { $multiply: [{ $ifNull: ["$allItem.quantity", 0] }, conversionUnit] },
                  { $ifNull: ["$allItem.quantity", 0] }
                ]
              }
            }
          }
        }
      ]);
      const salesSum = Array.isArray(salesUnits) && salesUnits[0] ? Number(salesUnits[0].u) || 0 : 0;

      const returnUnits = await PharmReturnStock.aggregate([
        { $unwind: "$items" },
        { $match: { "items.itemId": pharmItem._id } },
        { $group: { _id: null, u: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
      ]);
      const returnSum = Array.isArray(returnUnits) && returnUnits[0] ? Number(returnUnits[0].u) || 0 : 0;

      const computedAvailable = openingUnits + inboundSum - salesSum - returnSum;
      pharmItem.availableQuantity = computedAvailable;
      await pharmItem.save();
    }

    console.log("POS transaction deleted and stock recalculated:", id);
    return res.status(200).json({
      status: "ok",
      message: "POS transaction deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting POS transaction:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get POS Summary/Statistics (Separate API)
const getpharmPosSummary = async (req, res) => {
  try {
    const baseQuery = await buildPharmPosQuery(req);

    // Build an alternate query that excludes createdAt constraint,
    // so we can apply date rules per-line for returns.
    let altQuery = baseQuery;
    if (baseQuery && baseQuery.$and && Array.isArray(baseQuery.$and)) {
      const filtered = baseQuery.$and.filter((c) => !(c && Object.prototype.hasOwnProperty.call(c, 'createdAt')));
      altQuery = filtered.length > 0 ? { $and: filtered } : {};
    }

    // Extract date range (if any) to apply specialized rules:
    // - Normal sales follow createdAt range
    // - Returns follow updatedAt range (so today's returns affect today's closing)
    const from = req.query.from ? new Date(req.query.from) : null;
    const toPlus1 = req.query.to ? (() => { const d = new Date(req.query.to); d.setDate(d.getDate() + 1); return d; })() : null;

    console.log('📊 Calculating POS summary with filters:', baseQuery, 'alt(no-date):', altQuery);

    const summaryStats = await PharmPos.aggregate([
      {
        $facet: {
          // Document-level totals obey the standard filters (including createdAt)
          docTotals: [
            { $match: baseQuery },
            {
              $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalPaid: { $sum: { $ifNull: ['$paid', 0] } },
                totalDue: { $sum: { $ifNull: ['$due', 0] } },
                totalDiscount: { $sum: { $ifNull: ['$totalDiscount', 0] } },
                totalTax: { $sum: { $ifNull: ['$totalTax', 0] } },
                totalAdvance: { $sum: { $ifNull: ['$advance', 0] } },
              }
            }
          ],
          // Line-level totals with special date handling for returns
          lineTotals: [
            { $match: altQuery },
            { $unwind: '$allItem' },
            ...(from || toPlus1
              ? [{
                  $match: {
                    $expr: {
                      $or: [
                        // Non-return lines: use createdAt window
                        {
                          $and: [
                            { $ne: [{ $ifNull: ['$allItem.isReturn', false] }, true] },
                            ...(from ? [{ $gte: ['$createdAt', from] }] : []),
                            ...(toPlus1 ? [{ $lt: ['$createdAt', toPlus1] }] : []),
                          ]
                        },
                        // Return lines: use updatedAt window
                        {
                          $and: [
                            { $eq: [{ $ifNull: ['$allItem.isReturn', false] }, true] },
                            ...(from ? [{ $gte: ['$updatedAt', from] }] : []),
                            ...(toPlus1 ? [{ $lt: ['$updatedAt', toPlus1] }] : []),
                          ]
                        }
                      ]
                    }
                  }
                }]
              : []),
            {
              $group: {
                _id: null,
                totalSales: {
                  $sum: {
                    $cond: [
                      { $eq: [{ $ifNull: ['$allItem.isReturn', false] }, true] },
                      { $multiply: [{ $ifNull: ['$allItem.totalAmount', 0] }, -1] },
                      { $ifNull: ['$allItem.totalAmount', 0] }
                    ]
                  }
                }
              }
            }
          ]
        }
      },
      {
        $project: {
          doc: { $ifNull: [{ $arrayElemAt: ['$docTotals', 0] }, {}] },
          line: { $ifNull: [{ $arrayElemAt: ['$lineTotals', 0] }, {}] }
        }
      },
      {
        $project: {
          _id: 0,
          totalTransactions: { $ifNull: ['$doc.totalTransactions', 0] },
          totalPaid: { $ifNull: ['$doc.totalPaid', 0] },
          totalDue: { $ifNull: ['$doc.totalDue', 0] },
          totalDiscount: { $ifNull: ['$doc.totalDiscount', 0] },
          totalTax: { $ifNull: ['$doc.totalTax', 0] },
          totalAdvance: { $ifNull: ['$doc.totalAdvance', 0] },
          totalSales: { $ifNull: ['$line.totalSales', 0] },
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

const addPatientPosLedgerPayment = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    if (!patientId) {
      return res.status(400).json({ status: "error", message: "Patient id is required" });
    }

    const incoming = Array.isArray(req.body?.payments) ? req.body.payments : [];
    const cleanedPayments = incoming
      .map((p) => ({
        method: p?.method || "",
        payDate: p?.payDate ? new Date(p.payDate) : new Date(),
        paid: Number(p?.paid) || 0,
        reference: p?.reference || "",
        chequeNo: p?.chequeNo || "",
        bankName: p?.bankName || "",
        chequeDate: p?.chequeDate ? new Date(p.chequeDate) : null,
        notes: p?.notes || "",
      }))
      .filter((p) => p.paid > 0);

    if (cleanedPayments.length === 0) {
      return res.status(400).json({ status: "error", message: "No valid payments provided" });
    }

    const posList = await PharmPos.find({ patientId, due: { $gt: 0 } })
      .sort({ createdAt: 1 })
      .select("_id due paid invoiceNumber")
      .lean();

    const totalDue = posList.reduce((sum, p) => sum + (Number(p.due) || 0), 0);
    const incomingTotal = cleanedPayments.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);

    if (incomingTotal > totalDue) {
      return res.status(400).json({
        status: "error",
        message: `Payment exceeds due. Due: ${totalDue}, Payment: ${incomingTotal}`,
      });
    }

    const bulkOps = [];
    let remainingPaymentIndex = 0;
    let remainingInCurrent = cleanedPayments[0]?.paid || 0;

    const paymentMetaForCurrent = () => {
      const p = cleanedPayments[remainingPaymentIndex];
      return {
        method: p.method,
        payDate: p.payDate,
        reference: p.reference,
        chequeNo: p.chequeNo,
        bankName: p.bankName,
        chequeDate: p.chequeDate,
        notes: p.notes,
      };
    };

    for (const pos of posList) {
      let dueLeft = Number(pos.due) || 0;
      if (dueLeft <= 0) continue;

      while (dueLeft > 0 && remainingPaymentIndex < cleanedPayments.length) {
        if (remainingInCurrent <= 0) {
          remainingPaymentIndex += 1;
          remainingInCurrent = cleanedPayments[remainingPaymentIndex]?.paid || 0;
          continue;
        }

        const applyAmount = Math.min(dueLeft, remainingInCurrent);
        const meta = paymentMetaForCurrent();

        bulkOps.push({
          updateOne: {
            filter: { _id: pos._id },
            update: {
              $inc: { paid: applyAmount, due: -applyAmount },
              $push: {
                payment: {
                  ...meta,
                  paid: applyAmount,
                },
              },
            },
          },
        });

        dueLeft -= applyAmount;
        remainingInCurrent -= applyAmount;
      }

      if (remainingPaymentIndex >= cleanedPayments.length) break;
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({ status: "error", message: "No due invoices found for this patient" });
    }

    await PharmPos.bulkWrite(bulkOps, { ordered: true });

    return res.status(200).json({ status: "ok", message: "Payment added" });
  } catch (err) {
    console.error("Error adding POS ledger payment:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const updatePatientPosLedgerPayment = async (req, res) => {
  try {
    const { patientId, posId, paymentId } = req.params;
    if (!patientId || !posId || !paymentId) {
      return res.status(400).json({ status: "error", message: "Invalid params" });
    }

    const pos = await PharmPos.findOne({ _id: posId, patientId }).lean();
    if (!pos) {
      return res.status(404).json({ status: "error", message: "POS invoice not found" });
    }

    const payment = (pos.payment || []).find((p) => String(p._id) === String(paymentId));
    if (!payment) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    const oldPaid = Number(payment.paid) || 0;
    const newPaid = Number(req.body?.payment?.paid) || 0;
    if (newPaid < 0) {
      return res.status(400).json({ status: "error", message: "Invalid payment amount" });
    }

    const delta = newPaid - oldPaid;
    const currentDue = Number(pos.due) || 0;
    if (delta > currentDue) {
      return res.status(400).json({ status: "error", message: "Payment exceeds due for this invoice" });
    }

    const nextMethod = req.body?.payment?.method || payment.method || "";
    const nextPayDate = req.body?.payment?.payDate ? new Date(req.body.payment.payDate) : payment.payDate;
    const nextReference = req.body?.payment?.reference ?? payment.reference ?? "";
    const nextChequeNo = req.body?.payment?.chequeNo ?? payment.chequeNo ?? "";
    const nextBankName = req.body?.payment?.bankName ?? payment.bankName ?? "";
    const nextChequeDate = req.body?.payment?.chequeDate ? new Date(req.body.payment.chequeDate) : (payment.chequeDate || null);
    const nextNotes = req.body?.payment?.notes ?? payment.notes ?? "";

    const update = {
      $set: {
        "payment.$[p].method": nextMethod,
        "payment.$[p].payDate": nextPayDate,
        "payment.$[p].paid": newPaid,
        "payment.$[p].reference": nextReference,
        "payment.$[p].chequeNo": nextChequeNo,
        "payment.$[p].bankName": nextBankName,
        "payment.$[p].chequeDate": nextChequeDate,
        "payment.$[p].notes": nextNotes,
      },
      $inc: { paid: delta, due: -delta },
    };

    const result = await PharmPos.updateOne(
      { _id: posId, patientId },
      update,
      { arrayFilters: [{ "p._id": paymentId }] }
    );

    if (!result?.matchedCount) {
      return res.status(404).json({ status: "error", message: "POS invoice not found" });
    }

    return res.status(200).json({ status: "ok", message: "Payment updated" });
  } catch (err) {
    console.error("Error updating POS ledger payment:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const deletePatientPosLedgerPayment = async (req, res) => {
  try {
    const { patientId, posId, paymentId } = req.params;
    if (!patientId || !posId || !paymentId) {
      return res.status(400).json({ status: "error", message: "Invalid params" });
    }

    const pos = await PharmPos.findOne({ _id: posId, patientId }).lean();
    if (!pos) {
      return res.status(404).json({ status: "error", message: "POS invoice not found" });
    }

    const payment = (pos.payment || []).find((p) => String(p._id) === String(paymentId));
    if (!payment) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    const oldPaid = Number(payment.paid) || 0;

    await PharmPos.updateOne(
      { _id: posId, patientId },
      {
        $pull: { payment: { _id: paymentId } },
        $inc: { paid: -oldPaid, due: oldPaid },
      }
    );

    return res.status(200).json({ status: "ok", message: "Payment deleted" });
  } catch (err) {
    console.error("Error deleting POS ledger payment:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const addPatientPosInvoicePayment = async (req, res) => {
  try {
    const { patientId, posId } = req.params;
    if (!patientId || !posId) {
      return res.status(400).json({ status: "error", message: "Invalid params" });
    }

    const pos = await PharmPos.findOne({ _id: posId, patientId }).lean();
    if (!pos) {
      return res.status(404).json({ status: "error", message: "POS invoice not found" });
    }

    const incoming = Array.isArray(req.body?.payments) ? req.body.payments : [];
    const cleanedPayments = incoming
      .map((p) => ({
        method: p?.method || "",
        payDate: p?.payDate ? new Date(p.payDate) : new Date(),
        paid: Number(p?.paid) || 0,
        reference: p?.reference || "",
        chequeNo: p?.chequeNo || "",
        bankName: p?.bankName || "",
        chequeDate: p?.chequeDate ? new Date(p.chequeDate) : null,
        notes: p?.notes || "",
      }))
      .filter((p) => p.paid > 0);

    if (cleanedPayments.length === 0) {
      return res.status(400).json({ status: "error", message: "No valid payments provided" });
    }

    const currentDue = Number(pos.due) || 0;
    const incomingTotal = cleanedPayments.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);
    if (incomingTotal > currentDue) {
      return res.status(400).json({
        status: "error",
        message: `Payment exceeds due for this invoice. Due: ${currentDue}, Payment: ${incomingTotal}`,
      });
    }

    await PharmPos.updateOne(
      { _id: posId, patientId },
      {
        $inc: { paid: incomingTotal, due: -incomingTotal },
        $push: { payment: { $each: cleanedPayments } },
      }
    );

    return res.status(200).json({ status: "ok", message: "Payment added" });
  } catch (err) {
    console.error("Error adding POS invoice payment:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

const getPosByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const patientId = req.query.patient;
    const minAmount = req.query.minAmount;
    const maxAmount = req.query.maxAmount;

    const query = { "allItem.pharmItemId": itemId };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (minAmount || maxAmount) {
      query["allItem"] = { 
        $elemMatch: { 
          pharmItemId: itemId,
          totalAmount: {} 
        } 
      };
      if (minAmount) query["allItem"].$elemMatch.totalAmount.$gte = Number(minAmount);
      if (maxAmount) query["allItem"].$elemMatch.totalAmount.$lte = Number(maxAmount);
    }

    if (search) {
      // Create regex for case-insensitive search
      const searchRegex = new RegExp(search, "i");
      
      // Try to find patients matching the search term first
      // This is a bit of a workaround because we can't easily $or across populated fields in a single query efficiently
      // without aggregation, but let's stick to simple query for now and rely on direct fields if possible.
      // Or we can use aggregation to filter.
      
      query.$or = [
        { invoiceNumber: searchRegex },
        { patientName: searchRegex },
        { doctorName: searchRegex }
      ];
    }

    const total = await PharmPos.countDocuments(query);
    const data = await PharmPos.find(query)
      .populate('patientId', 'name mr')
      .populate('referId', 'name')
      .populate('createdBy', 'name')
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
  addpharmPos,
  getpharmPoss,
  getpharmPosById,
  updatepharmPos,
  deletepharmPos,
  getpharmPosSummary,
  addPatientPosLedgerPayment,
  updatePatientPosLedgerPayment,
  deletePatientPosLedgerPayment,
  addPatientPosInvoicePayment,
  getPosByItem
};
