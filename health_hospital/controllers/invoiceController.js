const { Types } = require("mongoose");
const Invoice = require("../models/invoiceModel");
const moment = require("moment");
const { hasCapabilityKey } = require("../middleware/auth");
const { isBeforeStartOfTodayLocal } = require("../utils/posClosingAndBackdate");
const {
  assignBranchIdForCreate,
  mergeBranchScopedQuery,
  branchDocumentVisible,
  applyStrictBranchListFilter,
  getScopedPatientIds,
} = require("../utils/branchScope");
const {
  resolveInvoiceFilterPatientIds,
  intersectObjectIdLists,
} = require("../utils/invoicePatientFilter");
const {
  roundMoneyAmount,
  procedureCurrentLineBalance,
  procedureRefundLineMarker,
  hasProcedureRefundOnLine,
  procedureMaxRefundable,
} = require("../utils/invoiceProcedureRefund");
const { computeClientBillFromItems } = require("../utils/invoiceBillTotals");

function assertInvoiceBackdatesAllowed(req, res, dates) {
  if (!req.user) return true;
  const list = Array.isArray(dates) ? dates : [];
  for (const dt of list) {
    if (dt == null || dt === "") continue;
    if (isBeforeStartOfTodayLocal(dt) && !hasCapabilityKey(req.user, "invoiceBackdate")) {
      res.status(403).json({
        status: "error",
        message: "Backdating patient invoices requires the 'Backdate patient invoices' permission.",
      });
      return false;
    }
  }
  return true;
}

/** 24-hex ObjectId string (strict) — avoids CastError from "" or invalid strings */
function isStrictObjectIdString(v) {
  if (v == null || v === "") return false;
  const s =
    typeof v === "object" && v !== null && "_id" in v ? String(v._id) : String(v);
  const t = s.trim();
  return /^[0-9a-fA-F]{24}$/i.test(t) && Types.ObjectId.isValid(t);
}

/**
 * Strip invalid ObjectIds and coerce numeric line fields so Mongoose does not throw CastError
 * (e.g. performedBy: "", rate: "10000" from form JSON).
 */
function sanitizeInvoiceWritePayload(body) {
  if (!body || typeof body !== "object") return body;
  const out = { ...body };

  if (out.doctorId != null && !isStrictObjectIdString(out.doctorId)) {
    delete out.doctorId;
  }

  const coerceNum = (v) => {
    if (v == null || v === "") return v;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  };

  const topLevelNumKeys = [
    "subTotalBill",
    "discountBill",
    "invoiceDiscount",
    "invoiceDiscountType",
    "taxBill",
    "totalBill",
    "duePay",
    "advancePay",
    "totalPay",
    "remainPay",
  ];
  for (const k of topLevelNumKeys) {
    if (k in out) out[k] = coerceNum(out[k]);
  }

  const cleanLine = (row) => {
    if (!row || typeof row !== "object") return row;
    const r = { ...row };
    const numKeys = [
      "rate",
      "quantity",
      "amount",
      "discount",
      "discountType",
      "tax",
      "total",
      "doctorAmount",
      "hospitalAmount",
      "expenseAmount",
    ];
    for (const k of numKeys) {
      if (k in r) r[k] = coerceNum(r[k]);
    }
    if (r.performedBy != null && !isStrictObjectIdString(r.performedBy)) {
      delete r.performedBy;
    }
    if (Array.isArray(r.assistedBy)) {
      r.assistedBy = r.assistedBy.filter((id) => isStrictObjectIdString(id));
    }
    if (Array.isArray(r.receptionStaff)) {
      r.receptionStaff = r.receptionStaff.filter((id) => isStrictObjectIdString(id));
    }
    if (Array.isArray(r.expenses)) {
      r.expenses = r.expenses
        .filter((e) => e && isStrictObjectIdString(e.expenseCategoryId || e.categoryId))
        .map((e) => ({
          ...e,
          amount: coerceNum(e.amount),
        }));
    }
    if (Array.isArray(r.doctorShares)) {
      r.doctorShares = r.doctorShares
        .filter((s) => s && isStrictObjectIdString(s.doctorId || s.userId))
        .map((s) => {
          const doctorId = s.doctorId || s.userId;
          const sv = coerceNum(s.shareValue ?? s.share);
          const st = String(s.shareType || "value").toLowerCase();
          return {
            doctorId,
            shareType: st === "percentage" ? "percentage" : "value",
            shareValue: typeof sv === "number" && Number.isFinite(sv) ? sv : 0,
            amount: coerceNum(s.amount),
          };
        });
    }
    if (Array.isArray(r.consumptions)) {
      r.consumptions = r.consumptions
        .filter((c) => c && isStrictObjectIdString(c.pharmItemId))
        .map((c) => ({
          ...c,
          qty: coerceNum(c.qty),
        }));
    }
    return r;
  };

  if (Array.isArray(out.item)) {
    out.item = out.item.map(cleanLine);
  }
  if (Array.isArray(out.invoiceExpenses)) {
    out.invoiceExpenses = out.invoiceExpenses
      .filter((e) => e && isStrictObjectIdString(e.expenseCategoryId || e.categoryId))
      .map((e) => ({ ...e, amount: coerceNum(e.amount) }));
  }
  if (Array.isArray(out.invoiceConsumptions)) {
    out.invoiceConsumptions = out.invoiceConsumptions
      .filter((c) => c && isStrictObjectIdString(c.pharmItemId))
      .map((c) => ({ ...c, qty: coerceNum(c.qty) }));
  }

  return out;
}

// 1. Create invoice
const addinvoice = async (req, res) => {
  try {



    const body = assignBranchIdForCreate(req, sanitizeInvoiceWritePayload({ ...req.body }));
    const datesToCheck = [];
    if (body.invoiceDate) datesToCheck.push(body.invoiceDate);
    if (Array.isArray(body.payment)) {
      for (const p of body.payment) {
        if (p && p.payDate) datesToCheck.push(p.payDate);
      }
    }
    if (!assertInvoiceBackdatesAllowed(req, res, datesToCheck)) {
      return;
    }
    const data = await Invoice.create(body);
    return res.status(200).json({ status: "ok", data: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all invoices
const getinvoices = async (req, res) => {
  try {
    const {
      doctorId,
      departmentId,
      patientMR,
      patientName,
      patientPhone,
      invoiceNo,
      invoiceNumber,
      paymentMode,
      procedureId,
      startDate,
      endDate,
      status,
      search = '',
      page = 1,
      minTotalBill,
      maxTotalBill,
      minDiscountBill,
      maxDiscountBill,
      minPaid,
      maxPaid,
      minDue,
      maxDue,
      minAdvance,
      maxAdvance,
      listMode,
    } = req.query;

    const requestedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 20;
    const query = {};

    const branchStrict = await applyStrictBranchListFilter(req, query);
    if (branchStrict === "empty") {
      const emptySummary = {
        totalSubTotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        grandTotal: 0,
        totalDue: 0,
        totalAdvance: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalDoctorShare: 0,
        totalHospitalShare: 0,
      };
      return res.status(200).json({
        status: "ok",
        data: [],
        search,
        page,
        summary: emptySummary,
        count: 0,
        totalPages: 0,
        currentPage: parseInt(page, 10) || 1,
        limit,
      });
    }

    // Basic filters
    if (doctorId && doctorId.trim() !== '') {
      // In aggregation pipeline, $match does NOT auto-cast strings to ObjectId.
      // If we keep a string here, it will return zero results even when invoices exist.
      query['doctorId'] = Types.ObjectId.isValid(doctorId) ? new Types.ObjectId(doctorId) : doctorId;
      console.log('Doctor filter applied:', query['doctorId']);
    }
    if (departmentId && departmentId.trim() !== '') {
      // Note: departmentId filter will be handled in aggregation pipeline
      // because department info comes through doctorId
      console.log('Department filter requested:', departmentId);
    }
    const filterPatientIds = await resolveInvoiceFilterPatientIds(req, {
      patientMR,
      patientName,
      patientPhone,
    });
    const hasPatientFieldFilters = filterPatientIds !== null;
    if (hasPatientFieldFilters) {
      if (filterPatientIds.length === 0) {
        const emptySummary = {
          totalSubTotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          grandTotal: 0,
          totalDue: 0,
          totalAdvance: 0,
          totalPaid: 0,
          totalRemaining: 0,
          totalDoctorShare: 0,
          totalHospitalShare: 0,
        };
        return res.status(200).json({
          status: "ok",
          data: [],
          search,
          page,
          summary: emptySummary,
          count: 0,
          totalPages: 0,
          currentPage: parseInt(page, 10) || 1,
          limit,
        });
      }
      query.patientId = { $in: filterPatientIds };
    }

    // Handle invoiceNo or invoiceNumber (both map to invoiceNo)
    const invoiceNoValue = invoiceNo || invoiceNumber;
    if (invoiceNoValue && invoiceNoValue.trim() !== '') query['invoiceNo'] = new RegExp(invoiceNoValue, 'i');
    
    // Status filter
    if (status && status.trim() !== '') {
      if (status === 'Paid') {
        query['duePay'] = 0;
      } else if (status === 'Pending') {
        query['duePay'] = { $gt: 0 };
      } else if (status === 'Credit') {
        query['duePay'] = { $lt: 0 };
      }
    }

    const itemElemMatches = [];

    // Procedure filter - corrected approach
    if (procedureId && procedureId.trim() !== '') {
      const procVal = Types.ObjectId.isValid(procedureId) ? new Types.ObjectId(procedureId) : procedureId;
      itemElemMatches.push({ procedureId: procVal });
    }

    if (listMode === 'procedureAdvance') {
      itemElemMatches.push({
        $or: [
          { procedureDate: null },
          { procedureDate: { $exists: false } },
        ],
      });
    }

    if (itemElemMatches.length === 1) {
      query['item'] = { $elemMatch: itemElemMatches[0] };
    } else if (itemElemMatches.length > 1) {
      query.$and = query.$and || [];
      itemElemMatches.forEach((cond) => {
        query.$and.push({ item: { $elemMatch: cond } });
      });
    }

    // Payment mode filter - corrected for array
    if (paymentMode && paymentMode.trim() !== '') {
      query['payment.method'] = paymentMode;
      // OR if you need to match any element in the array:
      // query['payment'] = {
      //   $elemMatch: {
      //     method: paymentMode
      //   }
      // };
    }

    // Total bill range
    if (minTotalBill || maxTotalBill) {
      query['totalBill'] = query['totalBill'] || {};
      if (minTotalBill && minTotalBill.trim() !== '') {
        query['totalBill'].$gte = parseFloat(minTotalBill);
        console.log('Min total amount filter applied:', parseFloat(minTotalBill));
      }
      if (maxTotalBill && maxTotalBill.trim() !== '') {
        query['totalBill'].$lte = parseFloat(maxTotalBill);
        console.log('Max total amount filter applied:', parseFloat(maxTotalBill));
      }
    }

    // Discount range
    if (minDiscountBill || maxDiscountBill) {
      query['discountBill'] = query['discountBill'] || {};
      if (minDiscountBill && minDiscountBill.trim() !== '') {
        query['discountBill'].$gte = parseFloat(minDiscountBill);
        console.log('Min discount filter applied:', parseFloat(minDiscountBill));
      }
      if (maxDiscountBill && maxDiscountBill.trim() !== '') {
        query['discountBill'].$lte = parseFloat(maxDiscountBill);
        console.log('Max discount filter applied:', parseFloat(maxDiscountBill));
      }
    }

    // Paid range
    if (minPaid || maxPaid) {
      query['totalPay'] = query['totalPay'] || {};
      if (minPaid && minPaid.trim() !== '') {
        query['totalPay'].$gte = parseFloat(minPaid);
        console.log('Min paid filter applied:', parseFloat(minPaid));
      }
      if (maxPaid && maxPaid.trim() !== '') {
        query['totalPay'].$lte = parseFloat(maxPaid);
        console.log('Max paid filter applied:', parseFloat(maxPaid));
      }
    }

    // Due range
    if (minDue || maxDue) {
      query['duePay'] = query['duePay'] || {};
      if (minDue && minDue.trim() !== '') {
        query['duePay'].$gte = parseFloat(minDue);
        console.log('Min due filter applied:', parseFloat(minDue));
      }
      if (maxDue && maxDue.trim() !== '') {
        query['duePay'].$lte = parseFloat(maxDue);
        console.log('Max due filter applied:', parseFloat(maxDue));
      }
    }

    // Advance range
    if (minAdvance || maxAdvance) {
      query['advancePay'] = query['advancePay'] || {};
      if (minAdvance && minAdvance.trim() !== '') {
        query['advancePay'].$gte = parseFloat(minAdvance);
        console.log('Min advance filter applied:', parseFloat(minAdvance));
      }
      if (maxAdvance && maxAdvance.trim() !== '') {
        query['advancePay'].$lte = parseFloat(maxAdvance);
        console.log('Max advance filter applied:', parseFloat(maxAdvance));
      }
    }

    // Date range filter — use document invoice date when set, else fallback to system createdAt
    if ((startDate && startDate.trim() !== '') || (endDate && endDate.trim() !== '')) {
      const exprParts = [];
      if (startDate && startDate.trim() !== '') {
        const parsedStartDate = new Date(startDate);
        exprParts.push({
          $gte: [{ $ifNull: ['$invoiceDate', '$createdAt'] }, parsedStartDate],
        });
        console.log('Start date filter (invoiceDate || createdAt):', parsedStartDate.toISOString());
      }
      if (endDate && endDate.trim() !== '') {
        const parsedEndDate = new Date(endDate);
        exprParts.push({
          $lte: [{ $ifNull: ['$invoiceDate', '$createdAt'] }, parsedEndDate],
        });
        console.log('End date filter (invoiceDate || createdAt):', parsedEndDate.toISOString());
      }
      query['$expr'] = exprParts.length === 1 ? exprParts[0] : { $and: exprParts };
    }

    // Text search — aggregation only when department or free-text search needs joined fields
    let useAggregation = false;
    if (
      (departmentId && departmentId.trim() !== '') ||
      (search && search.trim() !== '')
    ) {
      useAggregation = true;
    }
    if (search && search.trim() !== '' && !useAggregation) {
      query['$or'] = [
        { 'patientId.name': { $regex: search, $options: 'i' } },
        { 'patientId.mr': { $regex: search, $options: 'i' } },
        { 'doctorId.name': { $regex: search, $options: 'i' } },
        { 'item.description': { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } }
      ];
    }

    let invoices, count;

    // If patientMR filter or departmentId filter is applied, OR search param is present, use aggregation
    if (useAggregation) {
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'branches',
            localField: 'branchId',
            foreignField: '_id',
            as: 'branchData'
          }
        },
        { $unwind: { path: '$branchData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientData'
          }
        },
        { $unwind: { path: '$patientData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorData'
          }
        },
        { $unwind: { path: '$doctorData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'departments',
            localField: 'doctorData.departmentId',
            foreignField: '_id',
            as: 'departmentData'
          }
        },
        { $unwind: { path: '$departmentData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'procedures',
            localField: 'item.procedureId',
            foreignField: '_id',
            as: 'procedureData'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdById',
            foreignField: '_id',
            as: 'createdByData'
          }
        },
        { $unwind: { path: '$createdByData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'updatedById',
            foreignField: '_id',
            as: 'updatedByData'
          }
        },
        { $unwind: { path: '$updatedByData', preserveNullAndEmptyArrays: true } }
      ];

      // Add conditional filters (patient MR/name/phone resolved via query.patientId)
      if (invoiceNoValue && invoiceNoValue.trim() !== '') {
        pipeline.push({
          $match: {
            'invoiceNo': { $regex: invoiceNoValue, $options: 'i' }
          }
        });
      }
      if (departmentId && departmentId.trim() !== '') {
        pipeline.push({
          $match: {
            'departmentData._id': new Types.ObjectId(departmentId)
          }
        });
      }
      // Add search $match after patientData/doctorData unwind
      if (search && search.trim() !== '') {
        pipeline.push({
          $match: {
            $or: [
              { 'patientData.name': { $regex: search, $options: 'i' } },
              { 'patientData.mr': { $regex: search, $options: 'i' } },
              { 'patientData.phone': { $regex: search, $options: 'i' } },
              { 'patientData.cnic': { $regex: search, $options: 'i' } },
              { 'doctorData.name': { $regex: search, $options: 'i' } },
              { 'item.description': { $regex: search, $options: 'i' } },
              { invoiceNo: { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      // Add sorting and pagination
      pipeline.push({ $sort: { createdAt: -1 } });
      pipeline.push({ $skip: (parseInt(page) - 1) * limit });
      pipeline.push({ $limit: limit });

      // Count pipeline
      const countPipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientData'
          }
        },
        { $unwind: { path: '$patientData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorData'
          }
        },
        { $unwind: { path: '$doctorData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'departments',
            localField: 'doctorData.departmentId',
            foreignField: '_id',
            as: 'departmentData'
          }
        },
        { $unwind: { path: '$departmentData', preserveNullAndEmptyArrays: true } }
      ];

      // Add conditional filters to count pipeline
      if (invoiceNoValue && invoiceNoValue.trim() !== '') {
        countPipeline.push({
          $match: {
            'invoiceNo': { $regex: invoiceNoValue, $options: 'i' }
          }
        });
      }
      if (departmentId && departmentId.trim() !== '') {
        countPipeline.push({
          $match: {
            'departmentData._id': new Types.ObjectId(departmentId)
          }
        });
      }

      invoices = await Invoice.aggregate(pipeline);
      const countResult = await Invoice.aggregate(countPipeline);
      count = countResult.length;

      // Debug: print first invoice and patientData
      if (invoices.length > 0) {
        console.log('Aggregation result sample:', invoices[0]);
        console.log('Aggregation patientData:', invoices[0].patientData);
      } else {
        console.log('Aggregation result is empty');
      }

      // Transform data to match expected structure
      invoices = invoices.map(invoice => ({
        ...invoice,
        patientId: invoice.patientData,
        doctorId: invoice.doctorData,
        branchId: invoice.branchData || invoice.branchId,
        item: invoice.item.map(item => ({
          ...item,
          procedureId: invoice.procedureData.find(proc => proc._id.toString() === item.procedureId?.toString())
        }))
      }));

    } else {
      // Use simple find query for other filters
      invoices = await Invoice.find(query)
        .sort({ createdAt: -1 })
        .populate({ path: 'branchId', select: 'name address location phone email' })
        .populate({
          path: 'doctorId',
          populate: {
            path: 'departmentId'
          }
        })
        .populate('patientId')
        .populate('departmentId')
        .populate({
          path: 'item.procedureId',
          model: 'Procedure'
        })
        .limit(limit)
        .skip((parseInt(page) - 1) * limit)
        .exec();

      count = await Invoice.countDocuments(query);
    }

    // Debug log
    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('PatientMR filter:', patientMR);
    console.log('Found invoices:', invoices.length);
    
    // Debug department filter
    if (departmentId && departmentId.trim() !== '') {
      console.log('=== DEPARTMENT FILTER DEBUG ===');
      console.log('DepartmentId filter:', departmentId);
      
      // Check if any invoices have this departmentId
      const directQuery = await Invoice.find({ departmentId: departmentId }).limit(5);
      console.log('Direct departmentId query results:', directQuery.length);
      
      // Check all invoices to see departmentId values
      const allInvoices = await Invoice.find({}).limit(10);
      console.log('Sample invoices departmentId values:');
      allInvoices.forEach((inv, index) => {
        console.log(`Invoice ${index + 1}:`, {
          id: inv._id,
          departmentId: inv.departmentId,
          doctorId: inv.doctorId
        });
      });
      
      // Check if departmentId exists in any invoice
      const hasDepartmentId = await Invoice.findOne({ departmentId: { $exists: true, $ne: null } });
      console.log('Any invoice with departmentId field:', !!hasDepartmentId);
    }
    
    
    const summary = {
  totalSubTotal: 0,
  totalDiscount: 0,
  totalTax: 0,
  grandTotal: 0,
  totalDue: 0,
  totalAdvance: 0,
  totalPaid: 0,
  totalRemaining: 0,
   totalDoctorShare: 0, 
  totalHospitalShare: 0,
};


invoices.forEach(invoice => {
  summary.totalSubTotal += invoice.subTotalBill || 0;
  summary.totalDiscount += invoice.discountBill || 0;
  summary.totalTax += invoice.taxBill || 0;
  summary.grandTotal += invoice.totalBill || 0;
  summary.totalDue += invoice.duePay || 0;
  summary.totalAdvance += invoice.advancePay || 0;
  summary.totalPaid += invoice.totalPay || 0;
  summary.totalRemaining += invoice.remainPay || 0
  
   if (invoice.item && invoice.item.length > 0) {
    invoice.item.forEach(item => {
      summary.totalDoctorShare += item.doctorAmount || 0;
      summary.totalHospitalShare += item.hospitalAmount || 0;
    });
  }
  
});

 


    res.status(200).json({
      status: "ok",
      data: invoices,
      search,
      page,
       summary: summary, 
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// 3. Get invoice by id
const getinvoiceById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = rawId != null ? String(rawId).trim() : "";
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "Invalid invoice id" });
    }

    const basePopulates = () =>
      Invoice.findById(id)
        .populate({ path: "branchId", select: "name address location phone email" })
        .populate("patientId")
        .populate({ path: "doctorId", populate: { path: "departmentId" } })
        .populate("departmentId");

    let data;
    try {
      data = await basePopulates()
        .populate({ path: "item.procedureId", model: "Procedure" })
        .populate({ path: "item.performedBy", select: "name" })
        .exec();
    } catch (popErr) {
      console.error("getinvoiceById nested populate failed:", popErr?.message || popErr);
      try {
        data = await basePopulates()
          .populate({ path: "item.procedureId", model: "Procedure" })
          .exec();
      } catch (popErr2) {
        console.error("getinvoiceById procedure populate failed:", popErr2?.message || popErr2);
        data = await basePopulates().exec();
      }
    }

    if (!data || !(await branchDocumentVisible(req, data.branchId))) {
      return res.status(404).json({ status: "fail", message: "Invoice not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update invoice
const updateinvoice = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await Invoice.findById(id);
    if (!getImage || !(await branchDocumentVisible(req, getImage.branchId))) {
      return res.status(404).json({ status: "fail", message: "Invoice not found" });
    }

    const datesToCheck = [];
    if (req.body.invoiceDate != null && req.body.invoiceDate !== "") {
      datesToCheck.push(req.body.invoiceDate);
    }
    if (Array.isArray(req.body.payment)) {
      for (const p of req.body.payment) {
        if (p && p.payDate) datesToCheck.push(p.payDate);
      }
    }
    if (!assertInvoiceBackdatesAllowed(req, res, datesToCheck)) {
      return;
    }

    const data = await Invoice.findByIdAndUpdate(
      id,
      sanitizeInvoiceWritePayload({ ...req.body }),
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addInvoicePayments = async (req, res) => {
  try {
    const id = req.params.id;
    const invoice = await Invoice.findById(id);
    if (!invoice || !(await branchDocumentVisible(req, invoice.branchId))) {
      return res.status(404).json({ status: "error", message: "Invoice not found" });
    }

    const incoming = Array.isArray(req.body?.payments) ? req.body.payments : [];
    const cleanedPayments = incoming
      .map((p) => ({
        method: p?.method || '',
        payDate: p?.payDate ? new Date(p.payDate) : new Date(),
        paid: Number(p?.paid) || 0,
        reference: p?.reference || '',
        chequeNo: p?.chequeNo || '',
        bankName: p?.bankName || '',
        chequeDate: p?.chequeDate ? new Date(p.chequeDate) : undefined,
        notes: p?.notes || '',
      }))
      .filter((p) => p.paid > 0);

    if (cleanedPayments.length === 0) {
      return res.status(400).json({ status: "error", message: "No valid payments provided" });
    }

    const payDates = cleanedPayments.map((p) => p.payDate).filter(Boolean);
    if (!assertInvoiceBackdatesAllowed(req, res, payDates)) {
      return;
    }

    invoice.payment = Array.isArray(invoice.payment) ? invoice.payment : [];
    invoice.payment.push(...cleanedPayments);

    const totalPaid = (invoice.payment || []).reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    const totalBill = Number(invoice.totalBill) || 0;
    invoice.totalPay = totalPaid;
    invoice.duePay = totalBill - totalPaid;

    const updated = await invoice.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Add invoice payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Add invoice refund (records as negative payment)
const addInvoiceRefund = async (req, res) => {
  try {
    const id = req.params.id;
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ status: "error", message: "Invoice not found" });
    }

    const incoming = Array.isArray(req.body?.refunds) ? req.body.refunds : [];
    const cleanedRefunds = incoming
      .map((p) => ({
        method: p?.method || 'Refund',
        payDate: p?.payDate ? new Date(p.payDate) : new Date(),
        paid: -Math.abs(Number(p?.paid) || 0),
        reference: p?.reference || '',
        chequeNo: p?.chequeNo || '',
        bankName: p?.bankName || '',
        chequeDate: p?.chequeDate ? new Date(p.chequeDate) : undefined,
        notes: p?.notes || '',
      }))
      .filter((p) => Number.isFinite(p.paid) && p.paid < 0);

    if (cleanedRefunds.length === 0) {
      return res.status(400).json({ status: "error", message: "No valid refunds provided" });
    }

    const refundDates = cleanedRefunds.map((p) => p.payDate).filter(Boolean);
    if (!assertInvoiceBackdatesAllowed(req, res, refundDates)) {
      return;
    }

    invoice.payment = Array.isArray(invoice.payment) ? invoice.payment : [];
    invoice.payment.push(...cleanedRefunds);

    const totalPaid = (invoice.payment || []).reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    const totalBill = Number(invoice.totalBill) || 0;
    invoice.totalPay = totalPaid;
    invoice.duePay = totalBill - totalPaid;

    const updated = await invoice.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Add invoice refund error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Add procedure-level refund: adjusts item amounts and totals, and records negative payment
const addProcedureRefund = async (req, res) => {
  try {
    const id = req.params.id;
    const { procedureId, itemIndex: itemIndexRaw, method, paid, payDate, reference, notes } =
      req.body || {};
    const refundAmount = Math.abs(Number(paid) || 0);
    if (!procedureId) {
      return res.status(400).json({ status: "error", message: "procedureId is required" });
    }
    if (!refundAmount || !Number.isFinite(refundAmount)) {
      return res.status(400).json({ status: "error", message: "Valid refund amount is required" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice || !(await branchDocumentVisible(req, invoice.branchId))) {
      return res.status(404).json({ status: "error", message: "Invoice not found" });
    }

    const refundPayDate = payDate ? new Date(payDate) : new Date();
    if (!assertInvoiceBackdatesAllowed(req, res, [refundPayDate])) {
      return;
    }

    const items = Array.isArray(invoice.item) ? invoice.item : [];
    const normalizeId = (v) => {
      if (!v) return null;
      try {
        return String(v);
      } catch {
        return null;
      }
    };
    const targetId = normalizeId(procedureId);
    let itemIndex = -1;
    const idxParsed = parseInt(itemIndexRaw, 10);
    if (
      Number.isFinite(idxParsed) &&
      idxParsed >= 0 &&
      idxParsed < items.length
    ) {
      const pid = normalizeId(
        items[idxParsed]?.procedureId?._id || items[idxParsed]?.procedureId,
      );
      if (pid && pid === targetId) itemIndex = idxParsed;
    }
    if (itemIndex < 0) {
      for (let i = 0; i < items.length; i++) {
        const pid = normalizeId(items[i]?.procedureId?._id || items[i]?.procedureId);
        if (pid && pid === targetId) {
          itemIndex = i;
          break;
        }
      }
    }
    if (itemIndex < 0) {
      return res.status(404).json({ status: "error", message: "Procedure not found in invoice items" });
    }

    const item = items[itemIndex];
    const itemTotalBefore = procedureCurrentLineBalance(item);

    if (hasProcedureRefundOnLine(invoice.payment, targetId, itemIndex)) {
      return res.status(400).json({
        status: "error",
        message:
          "Refund already recorded for this procedure line. It cannot be refunded again.",
      });
    }

    const maxRefundable = procedureMaxRefundable(
      item,
      invoice.payment,
      targetId,
      itemIndex,
    );
    if (maxRefundable <= 0) {
      return res.status(400).json({
        status: "error",
        message: "This procedure line has no refundable balance",
        maxRefundable: 0,
      });
    }
    if (refundAmount > maxRefundable + 0.009) {
      return res.status(400).json({
        status: "error",
        message: `Refund cannot exceed Rs. ${maxRefundable.toFixed(2)} for this procedure line`,
        maxRefundable,
      });
    }
    const applyAmount = Math.min(refundAmount, maxRefundable);

    const currentItemAmount = Number(item?.amount) || 0;
    const proportion =
      itemTotalBefore > 0 ? applyAmount / itemTotalBefore : 0;
    const newLineBalance = roundMoneyAmount(
      Math.max(0, itemTotalBefore - applyAmount),
    );

    item.total = newLineBalance;
    if (currentItemAmount > 0 && itemTotalBefore > 0) {
      item.amount = roundMoneyAmount(
        Math.max(0, currentItemAmount * (newLineBalance / itemTotalBefore)),
      );
    } else {
      item.amount = newLineBalance;
    }
    if (Number.isFinite(item.doctorAmount)) {
      item.doctorAmount = Math.max(
        0,
        Number(item.doctorAmount) - Number(item.doctorAmount) * proportion,
      );
    }
    if (Number.isFinite(item.hospitalAmount)) {
      item.hospitalAmount = Math.max(
        0,
        Number(item.hospitalAmount) - Number(item.hospitalAmount) * proportion,
      );
    }

    invoice.item[itemIndex] = item;
    const billTotals = computeClientBillFromItems(
      items,
      invoice.invoiceDiscount,
      invoice.invoiceDiscountType,
    );
    invoice.subTotalBill = billTotals.subTotalBill;
    invoice.discountBill = billTotals.discountBill;
    invoice.taxBill = Number(invoice.taxBill) || 0;
    invoice.totalBill = billTotals.totalBill;

    const paymentEntry = {
      method: method || "Refund",
      payDate: refundPayDate,
      paid: -Math.abs(applyAmount),
      reference: reference || "",
      chequeNo: "",
      bankName: "",
      chequeDate: undefined,
      notes: `${procedureRefundLineMarker(targetId, itemIndex)}${notes ? ` | ${notes}` : ""}`,
    };

    invoice.payment = Array.isArray(invoice.payment) ? invoice.payment : [];
    invoice.payment.push(paymentEntry);

    const totalPaid = (invoice.payment || []).reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    invoice.totalPay = totalPaid;
    const rawDue = billTotals.clientBill - totalPaid;
    invoice.duePay = rawDue > 0 ? roundMoneyAmount(rawDue) : 0;
    invoice.advancePay = rawDue < 0 ? roundMoneyAmount(Math.abs(rawDue)) : 0;

    const updated = await invoice.save();
    return res.status(200).json({
      status: "ok",
      data: updated,
      appliedRefund: applyAmount,
      maxRefundable,
    });
  } catch (err) {
    console.error("Add procedure refund error:", err);
    res.status(500).json({ error: err.message });
  }
};
// 5. Delete invoice
const deleteinvoice = async (req, res) => {
  try {
    const id = req.params.id;
    const row = await Invoice.findById(id);
    if (!row || !(await branchDocumentVisible(req, row.branchId))) {
      return res.status(404).json({ status: "fail", message: "Invoice not found" });
    }
    await Invoice.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "invoice deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Invoice Summary/Statistics - Separate dedicated API
const getInvoiceSummary = async (req, res) => {
  try {
    const {
      doctorId,
      departmentId,
      patientMR,
      paymentMode,
      procedureId,
      startDate,
      endDate,
      status,
      search = '',
      minTotalBill,
      maxTotalBill,
    } = req.query;

    const matchQuery = {};

    const summaryScopedPatientIds = await getScopedPatientIds(req);
    if (summaryScopedPatientIds !== null) {
      matchQuery.patientId =
        summaryScopedPatientIds.length === 0 ? { $in: [] } : { $in: summaryScopedPatientIds };
    } else {
      const branchInv = await mergeBranchScopedQuery(req);
      if (branchInv) Object.assign(matchQuery, branchInv);
    }

    const summaryFilterPatientIds = await resolveInvoiceFilterPatientIds(req, {
      patientMR,
      patientName: req.query.patientName,
      patientPhone: req.query.patientPhone,
    });
    if (summaryFilterPatientIds !== null) {
      if (summaryFilterPatientIds.length === 0) {
        matchQuery.patientId = { $in: [] };
      } else if (matchQuery.patientId && matchQuery.patientId.$in) {
        matchQuery.patientId = {
          $in: intersectObjectIdLists(
            matchQuery.patientId.$in,
            summaryFilterPatientIds,
          ),
        };
      } else {
        matchQuery.patientId = { $in: summaryFilterPatientIds };
      }
    }

    // Apply same filters as getinvoices
    if (doctorId && doctorId.trim() !== '') {
      matchQuery['doctorId'] = Types.ObjectId.isValid(doctorId) ? new Types.ObjectId(doctorId) : doctorId;
    }
    if (status && status.trim() !== '') {
      if (status === 'Paid') {
        matchQuery['duePay'] = 0;
      } else if (status === 'Pending') {
        matchQuery['duePay'] = { $gt: 0 };
      } else if (status === 'Credit') {
        matchQuery['duePay'] = { $lt: 0 };
      }
    }
    if (procedureId && procedureId.trim() !== '') {
      const procVal = Types.ObjectId.isValid(procedureId)
        ? new Types.ObjectId(procedureId)
        : procedureId;
      matchQuery['item'] = {
        $elemMatch: {
          procedureId: procVal
        }
      };
    }
    if (paymentMode && paymentMode.trim() !== '') {
      matchQuery['payment.method'] = paymentMode;
    }
    if (minTotalBill || maxTotalBill) {
      matchQuery['totalBill'] = {};
      if (minTotalBill && minTotalBill.trim() !== '') {
        matchQuery['totalBill'].$gte = parseFloat(minTotalBill);
      }
      if (maxTotalBill && maxTotalBill.trim() !== '') {
        matchQuery['totalBill'].$lte = parseFloat(maxTotalBill);
      }
    }

    // Date range filter — invoiceDate when set, else createdAt
    if ((startDate && String(startDate).trim() !== '') || (endDate && String(endDate).trim() !== '')) {
      const exprParts = [];
      if (startDate && String(startDate).trim() !== '') {
        exprParts.push({
          $gte: [{ $ifNull: ['$invoiceDate', '$createdAt'] }, new Date(startDate)],
        });
      }
      if (endDate && String(endDate).trim() !== '') {
        exprParts.push({
          $lte: [{ $ifNull: ['$invoiceDate', '$createdAt'] }, new Date(endDate)],
        });
      }
      matchQuery['$expr'] = exprParts.length === 1 ? exprParts[0] : { $and: exprParts };
    }

    console.log('📊 Calculating invoice summary with filters:', matchQuery);

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchQuery }
    ];

    // If department filter is needed, add lookups
    if (departmentId && departmentId.trim() !== '') {
      pipeline.push(
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorData'
          }
        },
        { $unwind: { path: '$doctorData', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'doctorData.departmentId': new Types.ObjectId(departmentId)
          }
        }
      );
    }

    // Search filter
    if (search && search.trim() !== '') {
      pipeline.push(
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientData'
          }
        },
        {
          $match: {
            $or: [
              { invoiceNo: new RegExp(search, 'i') },
              { 'patientData.name': new RegExp(search, 'i') },
              { 'patientData.mr': new RegExp(search, 'i') }
            ]
          }
        }
      );
    }

    // Calculate summary statistics
    pipeline.push({
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalRevenue: { $sum: '$totalBill' },
        totalTax: { $sum: '$taxBill' },
        totalDiscount: { $sum: '$discountBill' },
        totalPaid: { $sum: '$totalPay' },
        totalDue: { $sum: '$duePay' },
        subTotal: { $sum: '$subTotalBill' },
        // Doctor and Hospital share calculation
        allItems: { $push: '$item' }
      }
    });

    const result = await Invoice.aggregate(pipeline);

    let summary = {
      totalTransactions: 0,
      totalRevenue: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalPaid: 0,
      totalDue: 0,
      subTotal: 0,
      totalDoctorShare: 0,
      totalHospitalShare: 0
    };

    if (result.length > 0) {
      const stats = result[0];
      
      // Calculate doctor and hospital shares
      let doctorShare = 0;
      let hospitalShare = 0;
      
      if (stats.allItems && Array.isArray(stats.allItems)) {
        stats.allItems.forEach(itemArray => {
          if (Array.isArray(itemArray)) {
            itemArray.forEach(item => {
              doctorShare += item.doctorAmount || 0;
              hospitalShare += item.hospitalAmount || 0;
            });
          }
        });
      }

      summary = {
        totalTransactions: stats.totalTransactions || 0,
        totalRevenue: stats.totalRevenue || 0,
        totalTax: stats.totalTax || 0,
        totalDiscount: stats.totalDiscount || 0,
        totalPaid: stats.totalPaid || 0,
        totalDue: stats.totalDue || 0,
        subTotal: stats.subTotal || 0,
        totalDoctorShare: doctorShare,
        totalHospitalShare: hospitalShare
      };
    }

    console.log('✅ Invoice summary calculated:', summary);

    return res.status(200).json({
      status: "ok",
      summary
    });
  } catch (err) {
    console.error('Error calculating invoice summary:', err);
    res.status(500).json({ 
      status: "error",
      error: err.message 
    });
  }
};

module.exports = {
  addinvoice,
  getinvoices,
  getinvoiceById,
  updateinvoice,
  addInvoicePayments,
  addInvoiceRefund,
  deleteinvoice,
  getInvoiceSummary,
  addProcedureRefund,
};
