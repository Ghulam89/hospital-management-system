const PharmSupplier = require("../models/pharmSupplierModel");
const PharmInboundStock = require("../models/pharmInboundStockModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible, catalogEntityVisibleForStaff, mergeCatalogPreferenceFilter } = require("../utils/branchScope");

async function inboundFilterForReq(req, extra = {}) {
  const q = { ...extra };
  const b = await mergeBranchScopedQuery(req);
  if (b) Object.assign(q, b);
  return q;
}

// 1. Create pharmSupplier
const addpharmSupplier = async (req, res) => {
  try {



      const data = await PharmSupplier.create(assignBranchIdForCreate(req, { ...req.body }));
      return res.status(200).json({ status: "ok", data: data });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getpharmSuppliers = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? req.query?.limit : 20;

    const catalogFilter = await mergeCatalogPreferenceFilter(req);
    const filters = [catalogFilter];
    const q = String(search || "").trim();
    if (q) {
      filters.push({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
          { address: { $regex: q, $options: "i" } },
          { primaryPersonName: { $regex: q, $options: "i" } },
        ],
      });
    }
    const baseQuery = filters.length === 1 ? filters[0] : { $and: filters };

    const data = await PharmSupplier.find(baseQuery).sort({createdAt:-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmSupplier.countDocuments(baseQuery);

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

// 3. Get pharmSupplier by id
const getpharmSupplierById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }
    const id = req.params.id;
    const data = await PharmSupplier.findById(id);
    if (!data) {
      return res.status(404).json({ status: "fail", message: "Supplier not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmSupplier
const updatepharmSupplier = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await PharmSupplier.findById(id);
    if (!getImage || !(await branchDocumentVisible(req, getImage.branchId))) {
      return res.status(404).json({ status: "fail", message: "Supplier not found" });
    }

    const data = await PharmSupplier.findByIdAndUpdate(
      id,
      { ...req.body,  },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmSupplier
const deletepharmSupplier = async (req, res) => {
  try {
    const id = req.params.id;
    const row = await PharmSupplier.findById(id);
    if (!row || !(await branchDocumentVisible(req, row.branchId))) {
      return res.status(404).json({ status: "fail", message: "Supplier not found" });
    }
    await PharmSupplier.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Pharmacy Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Supplier Ledger – purchases (inbound stock) with running balance
const getSupplierLedger = async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    if (!req.user) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const supplier = await PharmSupplier.findById(supplierId).lean();
    if (!supplier) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }

    const entries = [];
    const openingBalance = Number(supplier.openingBalance) || 0;
    if (openingBalance !== 0) {
      entries.push({
        date: supplier.createdAt || new Date(0),
        description: "Opening Balance",
        reference: "",
        type: "opening",
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      });
    }

    const inboundList = await PharmInboundStock.find(await inboundFilterForReq(req, { supplierId }))
      .sort({ date: 1, createdAt: 1 })
      .lean();

    for (const doc of inboundList) {
      const date = doc.date ? new Date(doc.date) : doc.createdAt;
      if (from && date < from) continue;
      if (to && date > to) continue;
      const total = Number(doc.grandTotal) || 0;
      entries.push({
        date,
        description: `Purchase ${doc.documentNumber || doc.supplierInvoiceNumber || doc._id}`,
        reference: doc.documentNumber || doc.supplierInvoiceNumber,
        type: "purchase",
        debit: total,
        credit: 0,
        purchaseId: doc._id,
      });

      if (doc.payment && Array.isArray(doc.payment)) {
        for (const p of doc.payment) {
          const payDate = p.payDate ? new Date(p.payDate) : date;
          if (from && payDate < from) continue;
          if (to && payDate > to) continue;
          entries.push({
            date: payDate,
            description: `Payment (Purchase ${doc.documentNumber || doc.supplierInvoiceNumber || doc._id})`,
            reference: doc.documentNumber || doc.supplierInvoiceNumber || "",
            type: "payment",
            debit: 0,
            credit: Number(p.paid) || 0,
            purchaseId: doc._id,
            paymentId: p?._id,
            method: p?.method || "",
            payDate,
            paid: Number(p?.paid) || 0,
            chequeNo: p?.chequeNo || "",
            bankName: p?.bankName || "",
            chequeDate: p?.chequeDate ? new Date(p.chequeDate) : null,
            notes: p?.notes || "",
            source: "purchase",
          });
        }
      }
      if (doc.adjustments && Array.isArray(doc.adjustments)) {
        for (const a of doc.adjustments) {
          const adjDate = a.adjDate ? new Date(a.adjDate) : date;
          if (from && adjDate < from) continue;
          if (to && adjDate > to) continue;
          const isDebit = String(a.direction || "").toLowerCase() === "debit";
          const isCredit = String(a.direction || "").toLowerCase() === "credit";
          const amt = Number(a.amount) || 0;
          if (amt <= 0) continue;
          entries.push({
            date: adjDate,
            description: `Adjustment (Purchase ${doc.documentNumber || doc.supplierInvoiceNumber || doc._id}) ${a.reference || ''}`.trim(),
            reference: doc.documentNumber || doc.supplierInvoiceNumber || "",
            type: "adjustment",
            debit: isDebit ? amt : 0,
            credit: isCredit ? amt : 0,
            purchaseId: doc._id,
            adjustmentId: a?._id,
            adjDate,
            amount: amt,
            direction: a?.direction || "",
            notes: a?.notes || "",
            source: "purchase",
          });
        }
      }
    }

    if (supplier.payments && Array.isArray(supplier.payments)) {
      for (const p of supplier.payments) {
        const payDate = p.payDate ? new Date(p.payDate) : supplier.createdAt || new Date(0);
        if (from && payDate < from) continue;
        if (to && payDate > to) continue;
        entries.push({
          date: payDate,
          description: `Payment ${p.reference || ''}`.trim(),
          reference: p.reference || "",
          type: "payment",
          debit: 0,
          credit: Number(p.paid) || 0,
          paymentId: p?._id,
          method: p?.method || "",
          payDate,
          paid: Number(p?.paid) || 0,
          chequeNo: p?.chequeNo || "",
          bankName: p?.bankName || "",
          chequeDate: p?.chequeDate ? new Date(p.chequeDate) : null,
          notes: p?.notes || "",
          source: "supplier",
        });
      }
    }
    if (supplier.adjustments && Array.isArray(supplier.adjustments)) {
      for (const a of supplier.adjustments) {
        const adjDate = a.adjDate ? new Date(a.adjDate) : supplier.createdAt || new Date(0);
        if (from && adjDate < from) continue;
        if (to && adjDate > to) continue;
        const isDebit = String(a.direction || "").toLowerCase() === "debit";
        const isCredit = String(a.direction || "").toLowerCase() === "credit";
        const amt = Number(a.amount) || 0;
        if (amt <= 0) continue;
        entries.push({
          date: adjDate,
          description: `Adjustment ${a.reference || ''}`.trim(),
          reference: a.reference || "",
          type: "adjustment",
          debit: isDebit ? amt : 0,
          credit: isCredit ? amt : 0,
          adjustmentId: a?._id,
          adjDate,
          amount: amt,
          direction: a?.direction || "",
          notes: a?.notes || "",
          source: "supplier",
        });
      }
    }

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const entriesWithBalance = entries.map((e) => {
      balance += (e.debit || 0) - (e.credit || 0);
      return { ...e, balance };
    });

    const closingBalance = entriesWithBalance.length
      ? entriesWithBalance[entriesWithBalance.length - 1].balance
      : 0;

    return res.status(200).json({
      status: "ok",
      data: {
        supplier: {
          _id: supplier._id,
          name: supplier.name,
          phone: supplier.phone,
          openingBalance,
        },
        entries: entriesWithBalance,
        closingBalance,
      },
    });
  } catch (err) {
    console.error("Supplier ledger error:", err);
    res.status(500).json({ error: err.message });
  }
};

const addSupplierLedgerAdjustment = async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    const supplier = await PharmSupplier.findById(supplierId);
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }
    const incoming = req.body?.adjustment || {};
    const amount = Number(incoming.amount) || 0;
    const direction = String(incoming.direction || "").trim();
    if (!(direction === "Debit" || direction === "Credit")) {
      return res.status(400).json({ status: "error", message: "direction must be Debit or Credit" });
    }
    if (amount <= 0) {
      return res.status(400).json({ status: "error", message: "Invalid adjustment amount" });
    }
    const adj = {
      adjDate: incoming.adjDate ? new Date(incoming.adjDate) : new Date(),
      direction,
      amount,
      reference: incoming.reference || "",
      notes: incoming.notes || "",
    };
    supplier.adjustments = Array.isArray(supplier.adjustments) ? supplier.adjustments : [];
    supplier.adjustments.push(adj);
    const updated = await supplier.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier ledger adjustment add error:", err);
    res.status(500).json({ error: err.message });
  }
};

const updateSupplierLedgerAdjustment = async (req, res) => {
  try {
    const { supplierId, adjustmentId } = req.params;
    const supplier = await PharmSupplier.findById(supplierId);
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }
    const a = supplier.adjustments?.id(adjustmentId);
    if (!a) {
      return res.status(404).json({ status: "error", message: "Adjustment not found" });
    }
    const incoming = req.body?.adjustment || {};
    if (incoming.amount !== undefined) {
      const amount = Number(incoming.amount) || 0;
      if (amount <= 0) {
        return res.status(400).json({ status: "error", message: "Invalid adjustment amount" });
      }
      a.amount = amount;
    }
    if (incoming.direction !== undefined) {
      const direction = String(incoming.direction || "").trim();
      if (!(direction === "Debit" || direction === "Credit")) {
        return res.status(400).json({ status: "error", message: "direction must be Debit or Credit" });
      }
      a.direction = direction;
    }
    if (incoming.adjDate !== undefined) {
      a.adjDate = incoming.adjDate ? new Date(incoming.adjDate) : new Date();
    }
    if (incoming.reference !== undefined) a.reference = incoming.reference || "";
    if (incoming.notes !== undefined) a.notes = incoming.notes || "";

    const updated = await supplier.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier ledger adjustment update error:", err);
    res.status(500).json({ error: err.message });
  }
};

const deleteSupplierLedgerAdjustment = async (req, res) => {
  try {
    const { supplierId, adjustmentId } = req.params;
    const supplier = await PharmSupplier.findById(supplierId);
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }
    const a = supplier.adjustments?.id(adjustmentId);
    if (!a) {
      return res.status(404).json({ status: "error", message: "Adjustment not found" });
    }
    a.deleteOne();
    const updated = await supplier.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier ledger adjustment delete error:", err);
    res.status(500).json({ error: err.message });
  }
};

const addSupplierLedgerPayment = async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    const supplier = await PharmSupplier.findById(supplierId);
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
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

    const inboundDocs = await PharmInboundStock.find(await inboundFilterForReq(req, { supplierId }))
      .sort({ date: 1, createdAt: 1 })
      .select("_id date createdAt documentNumber supplierInvoiceNumber grandTotal paid due payment status")
      .lean();

    const openPurchases = inboundDocs
      .map((doc) => {
        const grandTotal = Number(doc.grandTotal) || 0;
        const paymentArr = Array.isArray(doc.payment) ? doc.payment : [];
        const paidFromArr = paymentArr.reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
        const paid = doc.paid === undefined || doc.paid === null ? paidFromArr : (Number(doc.paid) || 0);
        const adjs = Array.isArray(doc.adjustments) ? doc.adjustments : [];
        const debitAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'debit' ? Number(a?.amount) || 0 : 0)), 0);
        const creditAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'credit' ? Number(a?.amount) || 0 : 0)), 0);
        const adjustedTotal = grandTotal + debitAdj - creditAdj;
        const due = doc.due === undefined || doc.due === null ? (adjustedTotal - paid) : (Number(doc.due) || 0);
        return { ...doc, grandTotal, paid, due };
      })
      .filter((d) => d.status !== "cancelled" && (Number(d.due) || 0) > 0);

    const totalDue = openPurchases.reduce((sum, d) => sum + (Number(d.due) || 0), 0);
    const incomingTotal = cleanedPayments.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);
    if (incomingTotal > totalDue) {
      return res.status(400).json({
        status: "error",
        message: `Payment exceeds due. Due: ${totalDue}, Payment: ${incomingTotal}`,
      });
    }

    const perPurchase = new Map();
    for (const d of openPurchases) {
      perPurchase.set(String(d._id), { basePaid: Number(d.paid) || 0, baseDue: Number(d.due) || 0, pushes: [], delta: 0 });
    }

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

    for (const purchase of openPurchases) {
      let dueLeft = Number(purchase.due) || 0;
      if (dueLeft <= 0) continue;

      while (dueLeft > 0 && remainingPaymentIndex < cleanedPayments.length) {
        if (remainingInCurrent <= 0) {
          remainingPaymentIndex += 1;
          remainingInCurrent = cleanedPayments[remainingPaymentIndex]?.paid || 0;
          continue;
        }

        const applyAmount = Math.min(dueLeft, remainingInCurrent);
        const meta = paymentMetaForCurrent();
        const agg = perPurchase.get(String(purchase._id));
        agg.delta += applyAmount;
        agg.pushes.push({ ...meta, paid: applyAmount });

        dueLeft -= applyAmount;
        remainingInCurrent -= applyAmount;
      }

      if (remainingPaymentIndex >= cleanedPayments.length) break;
    }

    const bulkOps = [];
    for (const [id, agg] of perPurchase.entries()) {
      if (!agg.pushes.length) continue;
      bulkOps.push({
        updateOne: {
          filter: { _id: id, supplierId },
          update: {
            $set: { paid: agg.basePaid + agg.delta, due: agg.baseDue - agg.delta },
            $push: { payment: { $each: agg.pushes } },
          },
        },
      });
    }

    if (!bulkOps.length) {
      return res.status(400).json({ status: "error", message: "No due purchases found for this supplier" });
    }

    await PharmInboundStock.bulkWrite(bulkOps, { ordered: true });

    return res.status(200).json({ status: "ok", message: "Payment added" });
  } catch (err) {
    console.error("Supplier ledger payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

const addSupplierPurchaseLedgerPayment = async (req, res) => {
  try {
    const { supplierId, purchaseId } = req.params;
    const supplier = await PharmSupplier.findById(supplierId).lean();
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }

    const doc = await PharmInboundStock.findOne(await inboundFilterForReq(req, { _id: purchaseId, supplierId }));
    if (!doc) {
      return res.status(404).json({ status: "error", message: "Purchase not found" });
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

    const grandTotal = Number(doc.grandTotal) || 0;
    const alreadyPaid = Array.isArray(doc.payment)
      ? doc.payment.reduce((sum, p) => sum + (Number(p?.paid) || 0), 0)
      : 0;
    const adjs = Array.isArray(doc.adjustments) ? doc.adjustments : [];
    const debitAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'debit' ? Number(a?.amount) || 0 : 0)), 0);
    const creditAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'credit' ? Number(a?.amount) || 0 : 0)), 0);
    const adjustedTotal = grandTotal + debitAdj - creditAdj;
    const due = adjustedTotal - alreadyPaid;

    const incomingTotal = cleanedPayments.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);
    if (incomingTotal > due) {
      return res.status(400).json({
        status: "error",
        message: `Payment exceeds due for this purchase. Due: ${due}, Payment: ${incomingTotal}`,
      });
    }

    doc.payment = Array.isArray(doc.payment) ? doc.payment : [];
    doc.payment.push(...cleanedPayments);

    const nextPaid = doc.payment.reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    doc.paid = nextPaid;
    doc.due = grandTotal - nextPaid;

    const updated = await doc.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier purchase payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

const updateSupplierPurchaseLedgerPayment = async (req, res) => {
  try {
    const { supplierId, purchaseId, paymentId } = req.params;

    const supplier = await PharmSupplier.findById(supplierId).lean();
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }

    const doc = await PharmInboundStock.findOne(await inboundFilterForReq(req, { _id: purchaseId, supplierId }));
    if (!doc) {
      return res.status(404).json({ status: "error", message: "Purchase not found" });
    }

    const p = doc.payment?.id(paymentId);
    if (!p) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    const incoming = req.body?.payment || {};
    const paid = incoming?.paid === undefined ? p.paid : Number(incoming.paid) || 0;
    if (paid < 0) {
      return res.status(400).json({ status: "error", message: "Invalid payment amount" });
    }

    if (incoming.method !== undefined) p.method = incoming.method || "";
    if (incoming.payDate !== undefined) p.payDate = incoming.payDate ? new Date(incoming.payDate) : new Date();
    if (incoming.reference !== undefined) p.reference = incoming.reference || "";
    if (incoming.chequeNo !== undefined) p.chequeNo = incoming.chequeNo || "";
    if (incoming.bankName !== undefined) p.bankName = incoming.bankName || "";
    if (incoming.chequeDate !== undefined) p.chequeDate = incoming.chequeDate ? new Date(incoming.chequeDate) : null;
    if (incoming.notes !== undefined) p.notes = incoming.notes || "";
    p.paid = paid;

    const grandTotal = Number(doc.grandTotal) || 0;
    const totalPaid = (doc.payment || []).reduce((sum, x) => sum + (Number(x?.paid) || 0), 0);
    const adjs = Array.isArray(doc.adjustments) ? doc.adjustments : [];
    const debitAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'debit' ? Number(a?.amount) || 0 : 0)), 0);
    const creditAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'credit' ? Number(a?.amount) || 0 : 0)), 0);
    const adjustedTotal = grandTotal + debitAdj - creditAdj;
    if (totalPaid > adjustedTotal) {
      return res.status(400).json({ status: "error", message: "Payment exceeds due for this purchase" });
    }

    doc.paid = totalPaid;
    doc.due = adjustedTotal - totalPaid;

    const updated = await doc.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier purchase payment update error:", err);
    res.status(500).json({ error: err.message });
  }
};

const deleteSupplierPurchaseLedgerPayment = async (req, res) => {
  try {
    const { supplierId, purchaseId, paymentId } = req.params;

    const supplier = await PharmSupplier.findById(supplierId).lean();
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }

    const doc = await PharmInboundStock.findOne(await inboundFilterForReq(req, { _id: purchaseId, supplierId }));
    if (!doc) {
      return res.status(404).json({ status: "error", message: "Purchase not found" });
    }

    const p = doc.payment?.id(paymentId);
    if (!p) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    p.deleteOne();

    const grandTotal = Number(doc.grandTotal) || 0;
    const totalPaid = (doc.payment || []).reduce((sum, x) => sum + (Number(x?.paid) || 0), 0);
    const adjs = Array.isArray(doc.adjustments) ? doc.adjustments : [];
    const debitAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'debit' ? Number(a?.amount) || 0 : 0)), 0);
    const creditAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'credit' ? Number(a?.amount) || 0 : 0)), 0);
    const adjustedTotal = grandTotal + debitAdj - creditAdj;
    doc.paid = totalPaid;
    doc.due = adjustedTotal - totalPaid;

    const updated = await doc.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier purchase payment delete error:", err);
    res.status(500).json({ error: err.message });
  }
};

const addSupplierPurchaseLedgerAdjustment = async (req, res) => {
  try {
    const { supplierId, purchaseId } = req.params;
    const supplier = await PharmSupplier.findById(supplierId).lean();
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }
    const doc = await PharmInboundStock.findOne(await inboundFilterForReq(req, { _id: purchaseId, supplierId }));
    if (!doc) {
      return res.status(404).json({ status: "error", message: "Purchase not found" });
    }
    const incoming = req.body?.adjustment || {};
    const amount = Number(incoming.amount) || 0;
    const direction = String(incoming.direction || "").trim();
    if (!(direction === "Debit" || direction === "Credit")) {
      return res.status(400).json({ status: "error", message: "direction must be Debit or Credit" });
    }
    if (amount <= 0) {
      return res.status(400).json({ status: "error", message: "Invalid adjustment amount" });
    }
    const adj = {
      adjDate: incoming.adjDate ? new Date(incoming.adjDate) : new Date(),
      direction,
      amount,
      reference: incoming.reference || "",
      notes: incoming.notes || "",
    };
    doc.adjustments = Array.isArray(doc.adjustments) ? doc.adjustments : [];
    doc.adjustments.push(adj);
    const payments = Array.isArray(doc.payment) ? doc.payment : [];
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    const grandTotal = Number(doc.grandTotal) || 0;
    const adjs = Array.isArray(doc.adjustments) ? doc.adjustments : [];
    const debitAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'debit' ? Number(a?.amount) || 0 : 0)), 0);
    const creditAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'credit' ? Number(a?.amount) || 0 : 0)), 0);
    const adjustedTotal = grandTotal + debitAdj - creditAdj;
    doc.paid = totalPaid;
    doc.due = adjustedTotal - totalPaid;
    const updated = await doc.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier purchase adjustment add error:", err);
    res.status(500).json({ error: err.message });
  }
};

const updateSupplierPurchaseLedgerAdjustment = async (req, res) => {
  try {
    const { supplierId, purchaseId, adjustmentId } = req.params;
    const supplier = await PharmSupplier.findById(supplierId).lean();
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }
    const doc = await PharmInboundStock.findOne(await inboundFilterForReq(req, { _id: purchaseId, supplierId }));
    if (!doc) {
      return res.status(404).json({ status: "error", message: "Purchase not found" });
    }
    const a = doc.adjustments?.id(adjustmentId);
    if (!a) {
      return res.status(404).json({ status: "error", message: "Adjustment not found" });
    }
    const incoming = req.body?.adjustment || {};
    if (incoming.amount !== undefined) {
      const amount = Number(incoming.amount) || 0;
      if (amount <= 0) {
        return res.status(400).json({ status: "error", message: "Invalid adjustment amount" });
      }
      a.amount = amount;
    }
    if (incoming.direction !== undefined) {
      const direction = String(incoming.direction || "").trim();
      if (!(direction === "Debit" || direction === "Credit")) {
        return res.status(400).json({ status: "error", message: "direction must be Debit or Credit" });
      }
      a.direction = direction;
    }
    if (incoming.adjDate !== undefined) {
      a.adjDate = incoming.adjDate ? new Date(incoming.adjDate) : new Date();
    }
    if (incoming.reference !== undefined) a.reference = incoming.reference || "";
    if (incoming.notes !== undefined) a.notes = incoming.notes || "";
    const payments = Array.isArray(doc.payment) ? doc.payment : [];
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    const grandTotal = Number(doc.grandTotal) || 0;
    const adjs = Array.isArray(doc.adjustments) ? doc.adjustments : [];
    const debitAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'debit' ? Number(a?.amount) || 0 : 0)), 0);
    const creditAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'credit' ? Number(a?.amount) || 0 : 0)), 0);
    const adjustedTotal = grandTotal + debitAdj - creditAdj;
    doc.paid = totalPaid;
    doc.due = adjustedTotal - totalPaid;
    const updated = await doc.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier purchase adjustment update error:", err);
    res.status(500).json({ error: err.message });
  }
};

const deleteSupplierPurchaseLedgerAdjustment = async (req, res) => {
  try {
    const { supplierId, purchaseId, adjustmentId } = req.params;
    const supplier = await PharmSupplier.findById(supplierId).lean();
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }
    const doc = await PharmInboundStock.findOne(await inboundFilterForReq(req, { _id: purchaseId, supplierId }));
    if (!doc) {
      return res.status(404).json({ status: "error", message: "Purchase not found" });
    }
    const a = doc.adjustments?.id(adjustmentId);
    if (!a) {
      return res.status(404).json({ status: "error", message: "Adjustment not found" });
    }
    a.deleteOne();
    const payments = Array.isArray(doc.payment) ? doc.payment : [];
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p?.paid) || 0), 0);
    const grandTotal = Number(doc.grandTotal) || 0;
    const adjs = Array.isArray(doc.adjustments) ? doc.adjustments : [];
    const debitAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'debit' ? Number(a?.amount) || 0 : 0)), 0);
    const creditAdj = adjs.reduce((sum, a) => sum + ((String(a?.direction || '').toLowerCase() === 'credit' ? Number(a?.amount) || 0 : 0)), 0);
    const adjustedTotal = grandTotal + debitAdj - creditAdj;
    doc.paid = totalPaid;
    doc.due = adjustedTotal - totalPaid;
    const updated = await doc.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier purchase adjustment delete error:", err);
    res.status(500).json({ error: err.message });
  }
};
const updateSupplierLedgerPayment = async (req, res) => {
  try {
    const { supplierId, paymentId } = req.params;
    const supplier = await PharmSupplier.findById(supplierId);
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }

    const p = supplier.payments?.id(paymentId);
    if (!p) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    const incoming = req.body?.payment || {};
    const paid = incoming?.paid === undefined ? p.paid : Number(incoming.paid) || 0;
    if (paid < 0) {
      return res.status(400).json({ status: "error", message: "Invalid payment amount" });
    }

    if (incoming.method !== undefined) p.method = incoming.method || "";
    if (incoming.payDate !== undefined) p.payDate = incoming.payDate ? new Date(incoming.payDate) : new Date();
    if (incoming.reference !== undefined) p.reference = incoming.reference || "";
    if (incoming.chequeNo !== undefined) p.chequeNo = incoming.chequeNo || "";
    if (incoming.bankName !== undefined) p.bankName = incoming.bankName || "";
    if (incoming.chequeDate !== undefined) p.chequeDate = incoming.chequeDate ? new Date(incoming.chequeDate) : undefined;
    if (incoming.notes !== undefined) p.notes = incoming.notes || "";
    p.paid = paid;

    const updated = await supplier.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier ledger payment update error:", err);
    res.status(500).json({ error: err.message });
  }
};

const deleteSupplierLedgerPayment = async (req, res) => {
  try {
    const { supplierId, paymentId } = req.params;
    const supplier = await PharmSupplier.findById(supplierId);
    if (!supplier || !(await catalogEntityVisibleForStaff(req, supplier.branchId))) {
      return res.status(404).json({ status: "error", message: "Supplier not found" });
    }

    const p = supplier.payments?.id(paymentId);
    if (!p) {
      return res.status(404).json({ status: "error", message: "Payment not found" });
    }

    p.deleteOne();
    const updated = await supplier.save();
    return res.status(200).json({ status: "ok", data: updated });
  } catch (err) {
    console.error("Supplier ledger payment delete error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpharmSupplier,
  getpharmSuppliers,
  getpharmSupplierById,
  getSupplierLedger,
  addSupplierLedgerPayment,
  updateSupplierLedgerPayment,
  deleteSupplierLedgerPayment,
  addSupplierPurchaseLedgerPayment,
  updateSupplierPurchaseLedgerPayment,
  deleteSupplierPurchaseLedgerPayment,
  addSupplierLedgerAdjustment,
  updateSupplierLedgerAdjustment,
  deleteSupplierLedgerAdjustment,
  addSupplierPurchaseLedgerAdjustment,
  updateSupplierPurchaseLedgerAdjustment,
  deleteSupplierPurchaseLedgerAdjustment,
  updatepharmSupplier,
  deletepharmSupplier,
};
