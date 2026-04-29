const Expense = require("../models/expenseModel");
const { mergeBranchScopedQuery, assignBranchIdForCreate, branchDocumentVisible } = require("../utils/branchScope");

const startOfDay = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDayExclusive = (value) => {
  const d = startOfDay(value);
  if (!d) return null;
  d.setDate(d.getDate() + 1);
  return d;
};

// 1. Create expense
const addexpense = async (req, res) => {
  try {



      const image =
        req.files.image === undefined
          ? ''
          : req.files.image[0].filename;


      const payload = assignBranchIdForCreate(req, { ...req.body, image });
      const data = await Expense.create(payload);
      return res.status(200).json({ status: "ok", data: data });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getexpenses = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 20;

    const baseQuery = {};

    const branchQList = await mergeBranchScopedQuery(req);
    if (branchQList) Object.assign(baseQuery, branchQList);

    const module = String(req.query.module || "").trim();
    if (module) {
      baseQuery.module = module;
    }

    if (search) {
      baseQuery.$or = [
        { description: { $regex: search, $options: "i" } },
        { paymentMode: { $regex: search, $options: "i" } },
      ];
    }



    if (req.query.paymentMode) {
      baseQuery.paymentMode = req.query.paymentMode;
    }

    if (req.query.expenseCategoryId) {
      baseQuery.expenseCategoryId= req.query.expenseCategoryId ;
    }


    

    if (req.query.invoiceId) {
      baseQuery.invoiceId= req.query.invoiceId;
    }


    
    // Filter by created date
    const from = req.query.from || req.query.fromDate;
    const to = req.query.to || req.query.toDate;
    if (from || to) {
      baseQuery.createdAt = {};
      if (from) {
        const fromDate = startOfDay(from);
        if (fromDate) baseQuery.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = endOfDayExclusive(to);
        if (toDate) baseQuery.createdAt.$lt = toDate;
      }
    }

    const data = await Expense.find(baseQuery).sort({createdAt:-1})
      .populate('expenseCategoryId')
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await Expense.countDocuments(baseQuery);

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

// 3. Get expense by id
const getexpenseById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await Expense.findById(id);
    if (!data || !(await branchDocumentVisible(req, data.branchId))) {
      return res.status(404).json({ status: "fail", message: "Expense not found" });
    }
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update expense
const updateexpense = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await Expense.findById(id);
    const image =
      req.files.image === undefined
        ? getImage.image
        : req.files.image[0].filename;

    const data = await Expense.findByIdAndUpdate(
      id,
      { ...req.body, image: image },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete expense
const deleteexpense = async (req, res) => {
  try {
    const id = req.params.id;
    const ex = await Expense.findById(id);
    if (!ex || !(await branchDocumentVisible(req, ex.branchId))) {
      return res.status(404).json({ status: "fail", message: "Expense not found" });
    }
    await Expense.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getExpenseSummary = async (req, res) => {
  try {
    const baseQuery = {};

    const branchQ = await mergeBranchScopedQuery(req);
    if (branchQ) Object.assign(baseQuery, branchQ);

    const module = String(req.query.module || "").trim();
    if (module) baseQuery.module = module;

    if (req.query.paymentMode) baseQuery.paymentMode = req.query.paymentMode;
    if (req.query.expenseCategoryId) baseQuery.expenseCategoryId = req.query.expenseCategoryId;
    if (req.query.invoiceId) baseQuery.invoiceId = req.query.invoiceId;

    const from = req.query.from || req.query.fromDate;
    const to = req.query.to || req.query.toDate;
    if (from || to) {
      baseQuery.createdAt = {};
      if (from) {
        const fromDate = startOfDay(from);
        if (fromDate) baseQuery.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = endOfDayExclusive(to);
        if (toDate) baseQuery.createdAt.$lt = toDate;
      }
    }

    const results = await Expense.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = results?.[0] || { totalAmount: 0, count: 0 };

    return res.status(200).json({
      status: "ok",
      summary: {
        totalAmount: Number(summary.totalAmount) || 0,
        count: Number(summary.count) || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: "error", error: err.message });
  }
};

module.exports = {
  addexpense,
  getexpenses,
  getExpenseSummary,
  getexpenseById,
  updateexpense,
  deleteexpense,

};
