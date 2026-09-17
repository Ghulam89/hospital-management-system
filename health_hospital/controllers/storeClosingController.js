const StoreClosing = require("../models/storeClosingModel");
const PharmPos = require("../models/pharmPosModel");
const Expense = require("../models/expenseModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible, branchDocumentDeletable } = require("../utils/branchScope");
const { startOfLocalDay, addOneLocalDay } = require("../utils/posClosingAndBackdate");

function calcExpectedCash({ openingCash, cashSales, totalExpenses, cashDeposit }) {
  const opening = Number(openingCash) || 0;
  const cash = Number(cashSales) || 0;
  const expenses = Number(totalExpenses) || 0;
  const deposit = Number(cashDeposit) || 0;
  return opening + cash - expenses - deposit;
}

function normalizePosPaymentMethod(method) {
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

async function aggregatePosPaymentsForDate(req, dateStr) {
  const dayStart = startOfLocalDay(dateStr);
  const dayEnd = addOneLocalDay(dayStart);

  const match = { createdAt: { $gte: dayStart, $lt: dayEnd } };
  const branchQ = await mergeBranchScopedQuery(req);
  if (branchQ) Object.assign(match, branchQ);

  const rows = await PharmPos.aggregate([
    { $match: match },
    {
      $project: {
        headerPaid: {
          $convert: { input: "$paid", to: "double", onError: 0, onNull: 0 },
        },
        payments: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$payment", []] } }, 0] },
            "$payment",
            [{ method: "Cash", paid: { $ifNull: ["$paid", 0] } }],
          ],
        },
      },
    },
    { $unwind: "$payments" },
    {
      $group: {
        _id: {
          $toLower: {
            $trim: { input: { $ifNull: ["$payments.method", "Cash"] } },
          },
        },
        total: {
          $sum: {
            $convert: {
              input: { $ifNull: ["$payments.paid", "$payments.amount"] },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
    },
  ]);

  const breakdown = emptyPaymentBreakdown();

  for (const row of rows) {
    const bucket = normalizePosPaymentMethod(row._id);
    const amt = Number(row.total) || 0;
    if (bucket === "cash") breakdown.cashSales += amt;
    else if (bucket === "credit") breakdown.creditSales += amt;
    else if (bucket === "card") breakdown.cardTransactions += amt;
    else if (bucket === "bankTransfer") breakdown.onlineCash += amt;
    else if (bucket === "cheque") breakdown.chequePayments += amt;
  }

  return breakdown;
}

async function getPreviousDayCashInHand(req, dateStr) {
  const dayStart = startOfLocalDay(dateStr);
  const prevStart = new Date(dayStart);
  prevStart.setDate(prevStart.getDate() - 1);

  const query = {
    closingDate: { $gte: prevStart, $lt: dayStart },
  };
  const branchQ = await mergeBranchScopedQuery(req);
  if (branchQ) Object.assign(query, branchQ);

  const prev = await StoreClosing.findOne(query).sort({ closingDate: -1 }).lean();
  return prev ? Number(prev.cashInHand) || 0 : 0;
}

async function getTotalExpensesForDate(req, dateStr) {
  const dayStart = startOfLocalDay(dateStr);
  const dayEnd = addOneLocalDay(dayStart);

  const query = {
    module: "pharmacy",
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

// Prep data for store closing form (auto-fill from POS + previous closing)
const getStoreClosingPrep = async (req, res) => {
  try {
    const dateStr = String(req.query.date || "").trim();
    if (!dateStr) {
      return res.status(400).json({
        status: "error",
        message: "date query parameter is required (YYYY-MM-DD)",
      });
    }

    const dayStart = startOfLocalDay(dateStr);
    const dayEnd = addOneLocalDay(dayStart);

    let existingQuery = {
      closingDate: { $gte: dayStart, $lt: dayEnd },
    };
    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(existingQuery, branchQ);

    const existingClosing = await StoreClosing.findOne(existingQuery).lean();

    const [openingCash, paymentBreakdown, totalExpenses] = await Promise.all([
      getPreviousDayCashInHand(req, dateStr),
      aggregatePosPaymentsForDate(req, dateStr),
      getTotalExpensesForDate(req, dateStr),
    ]);

  // Total sales from POS line totals (same date window)
    let salesMatch = { createdAt: { $gte: dayStart, $lt: dayEnd } };
    if (branchQ) Object.assign(salesMatch, branchQ);

    const salesRows = await PharmPos.aggregate([
      { $match: salesMatch },
      { $unwind: "$allItem" },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: {
              $ifNull: [
                {
                  $convert: {
                    input: "$allItem.totalAmount",
                    to: "double",
                    onError: null,
                    onNull: null,
                  },
                },
                {
                  $convert: {
                    input: "$allItem.netAmount",
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
              ],
            },
          },
        },
      },
    ]);

    const totalSales = salesRows?.[0] ? Number(salesRows[0].totalSales) || 0 : 0;
    const { cashSales, creditSales, cardTransactions, onlineCash, chequePayments } = paymentBreakdown;

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
      },
    });
  } catch (err) {
    console.error("Error preparing store closing:", err);
    return res.status(500).json({ status: "error", error: err.message });
  }
};

// Create store closing
const createStoreClosing = async (req, res) => {
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
      closedBy,
      status,
    } = req.body;

    // Validate required fields
    if (!closingDate) {
      return res.status(400).json({
        status: "error",
        message: "Closing date is required"
      });
    }

    if (openingCash === undefined || openingCash === null) {
      return res.status(400).json({
        status: "error",
        message: "Opening cash is required"
      });
    }

    if (totalSales === undefined || totalSales === null) {
      return res.status(400).json({
        status: "error",
        message: "Total sales is required"
      });
    }

    if (totalExpenses === undefined || totalExpenses === null) {
      return res.status(400).json({
        status: "error",
        message: "Total expenses is required"
      });
    }

    if (cashInHand === undefined || cashInHand === null) {
      return res.status(400).json({
        status: "error",
        message: "Cash in hand is required"
      });
    }

    if (!closedBy) {
      return res.status(400).json({
        status: "error",
        message: "Closed by is required"
      });
    }

    // Expected physical cash: opening + cash sales − expenses − bank deposit
    const expectedCash = calcExpectedCash({
      openingCash,
      cashSales,
      totalExpenses,
      cashDeposit,
    });
    const difference = cashInHand - expectedCash;

    const storeClosingData = assignBranchIdForCreate(req, {
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
      notes: notes || '',
      closedBy,
      status: status || 'Closed',
    });

    const data = await StoreClosing.create(storeClosingData);

    
    return res.status(200).json({
      status: "ok",
      message: "Store closing created successfully",
      data: data
    });
  } catch (err) {
    console.error('Error creating store closing:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

// Get all store closings
const getStoreClosings = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let from = req.query.from;
    let to = req.query.to;
    const limit = parseInt(req.query.limit) || 20;

    // Create base query
    let baseQuery = {};

    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(baseQuery, branchQ);

    // Date range filter
    if (from && to) {
      baseQuery.closingDate = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    // Search filter (search by closed by name)
    if (search) {
      // This will search in populated closedBy field
      baseQuery['$or'] = [
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const data = await StoreClosing.find(baseQuery)
      .populate({
        path: 'closedBy',
        select: 'name email'
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await StoreClosing.countDocuments(baseQuery);

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
    console.error('Error fetching store closings:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

// Get store closing by id
const getStoreClosingById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await StoreClosing.findById(id)
      .populate({
        path: 'closedBy',
        select: 'name email'
      });
    
    if (!data || !(await branchDocumentVisible(req, data.branchId))) {
      return res.status(404).json({
        status: "error",
        message: "Store closing not found"
      });
    }

    return res.status(200).json({
      status: "ok",
      data: data
    });
  } catch (err) {
    console.error('Error fetching store closing:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

// Update store closing
const updateStoreClosing = async (req, res) => {
  try {
    const id = req.params.id;
    
    const existingClosing = await StoreClosing.findById(id);
    if (!existingClosing) {
      return res.status(404).json({
        status: "error",
        message: "Store closing not found"
      });
    }

    const data = await StoreClosing.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate({
      path: 'closedBy',
      select: 'name email'
    });
    
    return res.status(200).json({
      status: "ok",
      message: "Store closing updated successfully",
      data: data
    });
  } catch (err) {
    console.error('Error updating store closing:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

// Delete store closing
const deleteStoreClosing = async (req, res) => {
  try {
    const id = req.params.id;
    
    const existingClosing = await StoreClosing.findById(id);
    if (!existingClosing || !(await branchDocumentDeletable(req, existingClosing.branchId))) {
      return res.status(404).json({
        status: "error",
        message: "Store closing not found"
      });
    }

    await StoreClosing.findByIdAndDelete(id);
    
    return res.status(200).json({
      status: "ok",
      message: "Store closing deleted successfully"
    });
  } catch (err) {
    console.error('Error deleting store closing:', err);
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
};

module.exports = {
  createStoreClosing,
  getStoreClosings,
  getStoreClosingById,
  getStoreClosingPrep,
  updateStoreClosing,
  deleteStoreClosing,
};
