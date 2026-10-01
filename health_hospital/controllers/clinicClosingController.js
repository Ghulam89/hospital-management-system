const ClinicClosing = require("../models/clinicClosingModel");
const Invoice = require("../models/invoiceModel");
const Expense = require("../models/expenseModel");
const {
  mergeBranchScopedQuery,
  assignBranchIdForCreate,
  branchDocumentVisible,
  branchDocumentDeletable,
} = require("../utils/branchScope");
const {
  startOfLocalDay,
  addOneLocalDay,
} = require("../utils/posClosingAndBackdate");
const { isBranchAdmin, isSuperAdmin } = require("../middleware/rbac");

function calcExpectedCash({ openingCash, cashSales, totalExpenses, cashDeposit }) {
  const opening = Number(openingCash) || 0;
  const cash = Number(cashSales) || 0;
  const expenses = Number(totalExpenses) || 0;
  const deposit = Number(cashDeposit) || 0;
  return opening + cash - expenses - deposit;
}

function isReceptionRole(role) {
  const value = String(role || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  return (
    value === "reception" ||
    value === "receptionist" ||
    value === "staff" ||
    value.includes("reception")
  );
}

function isElevatedViewer(user) {
  return isSuperAdmin(user) || isBranchAdmin(user);
}

function normalizePaymentMethod(method) {
  const m = String(method || "cash").trim().toLowerCase();
  if (m === "cash") return "cash";
  if (m === "credit") return "credit";
  if (m === "card") return "card";
  if (m === "bank transfer" || m === "online") return "bankTransfer";
  if (m === "cheque") return "cheque";
  return null;
}

function emptyPaymentBreakdown() {
  return {
    cashSales: 0,
    creditSales: 0,
    cardTransactions: 0,
    onlineCash: 0,
    chequePayments: 0,
  };
}

/** Closing scope user: reception always self; others may pass closedByUserId (admin view). */
function resolveClosingUserId(req, { forCreate = false } = {}) {
  const selfId = req.user?._id ? String(req.user._id) : null;
  if (!selfId) return null;
  if (forCreate) return selfId;
  if (isReceptionRole(req.user?.role) || !isElevatedViewer(req.user)) {
    return selfId;
  }
  const q = String(req.query.closedByUserId || req.body.closedByUserId || "").trim();
  if (q && /^[0-9a-fA-F]{24}$/i.test(q)) return q;
  return selfId;
}

async function aggregateInvoicePaymentsForUserDay(req, dateStr, userId) {
  const dayStart = startOfLocalDay(dateStr);
  const dayEnd = addOneLocalDay(dayStart);

  const match = {
    createdById: userId,
    $or: [
      { invoiceDate: { $gte: dayStart, $lt: dayEnd } },
      {
        invoiceDate: { $in: [null, ""] },
        createdAt: { $gte: dayStart, $lt: dayEnd },
      },
      {
        "payment.payDate": { $gte: dayStart, $lt: dayEnd },
      },
    ],
  };
  const branchQ = await mergeBranchScopedQuery(req);
  if (branchQ) Object.assign(match, branchQ);

  const rows = await Invoice.aggregate([
    { $match: match },
    {
      $project: {
        totalBill: {
          $convert: { input: "$totalBill", to: "double", onError: 0, onNull: 0 },
        },
        payments: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$payment", []] } }, 0] },
            "$payment",
            [],
          ],
        },
      },
    },
    {
      $facet: {
        sales: [
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$totalBill" },
            },
          },
        ],
        byMethod: [
          { $unwind: { path: "$payments", preserveNullAndEmptyArrays: false } },
          {
            $match: {
              $or: [
                {
                  "payments.payDate": { $gte: dayStart, $lt: dayEnd },
                },
                {
                  "payments.payDate": { $in: [null, ""] },
                },
              ],
            },
          },
          {
            $group: {
              _id: {
                $toLower: {
                  $trim: {
                    input: { $ifNull: ["$payments.method", "Cash"] },
                  },
                },
              },
              total: {
                $sum: {
                  $convert: {
                    input: { $ifNull: ["$payments.paid", 0] },
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
              },
            },
          },
        ],
      },
    },
  ]);

  const facet = rows?.[0] || {};
  const totalSales = facet.sales?.[0]
    ? Number(facet.sales[0].totalSales) || 0
    : 0;
  const breakdown = emptyPaymentBreakdown();

  for (const row of facet.byMethod || []) {
    const bucket = normalizePaymentMethod(row._id);
    const amt = Number(row.total) || 0;
    if (bucket === "cash") breakdown.cashSales += amt;
    else if (bucket === "credit") breakdown.creditSales += amt;
    else if (bucket === "card") breakdown.cardTransactions += amt;
    else if (bucket === "bankTransfer") breakdown.onlineCash += amt;
    else if (bucket === "cheque") breakdown.chequePayments += amt;
    else breakdown.cashSales += amt;
  }

  return { totalSales, ...breakdown };
}

async function getPreviousDayCashInHandForUser(req, dateStr, userId) {
  const dayStart = startOfLocalDay(dateStr);
  const prevStart = new Date(dayStart);
  prevStart.setDate(prevStart.getDate() - 1);

  const query = {
    closedBy: userId,
    closingDate: { $gte: prevStart, $lt: dayStart },
  };
  const branchQ = await mergeBranchScopedQuery(req);
  if (branchQ) Object.assign(query, branchQ);

  const prev = await ClinicClosing.findOne(query).sort({ closingDate: -1 }).lean();
  return prev ? Number(prev.cashInHand) || 0 : 0;
}

async function getClinicExpensesForDate(req, dateStr) {
  const dayStart = startOfLocalDay(dateStr);
  const dayEnd = addOneLocalDay(dayStart);

  const query = {
    module: { $in: ["clinic", "general", "invoice", "reception"] },
    createdAt: { $gte: dayStart, $lt: dayEnd },
  };
  const branchQ = await mergeBranchScopedQuery(req);
  if (branchQ) Object.assign(query, branchQ);

  const rows = await Expense.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
      },
    },
  ]);

  return rows?.[0] ? Number(rows[0].totalAmount) || 0 : 0;
}

const getClinicClosingPrep = async (req, res) => {
  try {
    const dateStr = String(req.query.date || "").trim();
    if (!dateStr) {
      return res.status(400).json({
        status: "error",
        message: "date query parameter is required (YYYY-MM-DD)",
      });
    }

    const userId = resolveClosingUserId(req);
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const dayStart = startOfLocalDay(dateStr);
    const dayEnd = addOneLocalDay(dayStart);

    let existingQuery = {
      closedBy: userId,
      closingDate: { $gte: dayStart, $lt: dayEnd },
    };
    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(existingQuery, branchQ);

    const existingClosing = await ClinicClosing.findOne(existingQuery).lean();

    const [openingCash, paymentBundle, totalExpenses] = await Promise.all([
      getPreviousDayCashInHandForUser(req, dateStr, userId),
      aggregateInvoicePaymentsForUserDay(req, dateStr, userId),
      getClinicExpensesForDate(req, dateStr),
    ]);

    const {
      totalSales,
      cashSales,
      creditSales,
      cardTransactions,
      onlineCash,
      chequePayments,
    } = paymentBundle;

    const expectedCash = calcExpectedCash({
      openingCash,
      cashSales,
      totalExpenses,
      cashDeposit: 0,
    });

    return res.status(200).json({
      status: "ok",
      prep: {
        openingCash,
        totalSales,
        cashSales,
        creditSales,
        cardTransactions,
        onlineCash,
        bankTransfer: onlineCash,
        chequePayments,
        totalExpenses,
        cashDeposit: 0,
        expectedCash,
        alreadyClosed: Boolean(existingClosing),
        previousClosingId: existingClosing?._id || null,
        closedByUserId: userId,
        userScoped: true,
      },
    });
  } catch (err) {
    console.error("Error preparing clinic closing:", err);
    return res.status(500).json({ status: "error", error: err.message });
  }
};

const createClinicClosing = async (req, res) => {
  try {
    const {
      closingDate,
      openingCash,
      totalSales,
      cashSales,
      onlineCash,
      cardTransactions,
      creditSales,
      chequePayments,
      cashDeposit,
      totalExpenses,
      cashInHand,
      notes,
      status,
    } = req.body;

    if (!closingDate) {
      return res.status(400).json({
        status: "error",
        message: "Closing date is required",
      });
    }
    if (openingCash === undefined || openingCash === null) {
      return res.status(400).json({
        status: "error",
        message: "Opening cash is required",
      });
    }
    if (totalSales === undefined || totalSales === null) {
      return res.status(400).json({
        status: "error",
        message: "Total sales is required",
      });
    }
    if (totalExpenses === undefined || totalExpenses === null) {
      return res.status(400).json({
        status: "error",
        message: "Total expenses is required",
      });
    }
    if (cashInHand === undefined || cashInHand === null) {
      return res.status(400).json({
        status: "error",
        message: "Cash in hand is required",
      });
    }

    const closedBy = resolveClosingUserId(req, { forCreate: true });
    if (!closedBy) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const dayStart = startOfLocalDay(closingDate);
    const dayEnd = addOneLocalDay(dayStart);
    let dupQuery = {
      closedBy,
      closingDate: { $gte: dayStart, $lt: dayEnd },
    };
    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(dupQuery, branchQ);

    const existing = await ClinicClosing.findOne(dupQuery).lean();
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "You already have a clinic closing for this date",
      });
    }

    const expectedCash = calcExpectedCash({
      openingCash,
      cashSales,
      totalExpenses,
      cashDeposit,
    });
    const difference = Number(cashInHand) - expectedCash;

    const clinicClosingData = assignBranchIdForCreate(req, {
      closingDate: closingDate ? new Date(closingDate) : closingDate,
      openingCash,
      totalSales,
      cashSales: Number(cashSales) || 0,
      onlineCash: Number(onlineCash) || 0,
      cardTransactions: Number(cardTransactions) || 0,
      creditSales: Number(creditSales) || 0,
      chequePayments: Number(chequePayments) || 0,
      cashDeposit: Number(cashDeposit) || 0,
      totalExpenses,
      cashInHand,
      expectedCash,
      difference,
      notes: notes || "",
      closedBy,
      status: status || "Closed",
    });

    const data = await ClinicClosing.create(clinicClosingData);

    return res.status(200).json({
      status: "ok",
      message: "Clinic closing created successfully",
      data,
    });
  } catch (err) {
    console.error("Error creating clinic closing:", err);
    res.status(500).json({ status: "error", error: err.message });
  }
};

const getClinicClosings = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const from = req.query.from;
    const to = req.query.to;
    const limit = parseInt(req.query.limit) || 20;

    const baseQuery = {};
    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(baseQuery, branchQ);

    // Reception / non-elevated: only own closings. Admin/superadmin: all in branch.
    if (!isElevatedViewer(req.user)) {
      if (!req.user?._id) {
        return res.status(200).json({
          status: "ok",
          data: [],
          page,
          count: 0,
          totalPages: 0,
          currentPage: page,
          limit,
        });
      }
      baseQuery.closedBy = req.user._id;
    }

    if (from && to) {
      baseQuery.closingDate = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    if (search) {
      baseQuery.notes = { $regex: search, $options: "i" };
    }

    const data = await ClinicClosing.find(baseQuery)
      .populate({ path: "closedBy", select: "name email role" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await ClinicClosing.countDocuments(baseQuery);

    return res.status(200).json({
      status: "ok",
      data,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit,
    });
  } catch (err) {
    console.error("Error fetching clinic closings:", err);
    res.status(500).json({ status: "error", error: err.message });
  }
};

const getClinicClosingById = async (req, res) => {
  try {
    const data = await ClinicClosing.findById(req.params.id).populate({
      path: "closedBy",
      select: "name email role",
    });

    if (!data || !(await branchDocumentVisible(req, data.branchId))) {
      return res.status(404).json({
        status: "error",
        message: "Clinic closing not found",
      });
    }

    if (
      !isElevatedViewer(req.user) &&
      String(data.closedBy?._id || data.closedBy) !== String(req.user?._id)
    ) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    return res.status(200).json({ status: "ok", data });
  } catch (err) {
    console.error("Error fetching clinic closing:", err);
    res.status(500).json({ status: "error", error: err.message });
  }
};

const updateClinicClosing = async (req, res) => {
  try {
    const existingClosing = await ClinicClosing.findById(req.params.id);
    if (!existingClosing) {
      return res.status(404).json({
        status: "error",
        message: "Clinic closing not found",
      });
    }
    if (!(await branchDocumentVisible(req, existingClosing.branchId))) {
      return res.status(404).json({
        status: "error",
        message: "Clinic closing not found",
      });
    }

    const data = await ClinicClosing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate({ path: "closedBy", select: "name email role" });

    return res.status(200).json({
      status: "ok",
      message: "Clinic closing updated successfully",
      data,
    });
  } catch (err) {
    console.error("Error updating clinic closing:", err);
    res.status(500).json({ status: "error", error: err.message });
  }
};

const deleteClinicClosing = async (req, res) => {
  try {
    const existingClosing = await ClinicClosing.findById(req.params.id);
    if (
      !existingClosing ||
      !(await branchDocumentDeletable(req, existingClosing.branchId))
    ) {
      return res.status(404).json({
        status: "error",
        message: "Clinic closing not found",
      });
    }

    await ClinicClosing.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      status: "ok",
      message: "Clinic closing deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting clinic closing:", err);
    res.status(500).json({ status: "error", error: err.message });
  }
};

module.exports = {
  createClinicClosing,
  getClinicClosings,
  getClinicClosingById,
  getClinicClosingPrep,
  updateClinicClosing,
  deleteClinicClosing,
};
