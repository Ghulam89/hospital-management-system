const Expense = require("../models/expenseModel");

// 1. Create expense
const addexpense = async (req, res) => {
  try {



      const image =
        req.files.image === undefined
          ? ''
          : req.files.image[0].filename;


      const data = await Expense.create({ ...req.body, image });
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

    // Create base query with optional gender filter
    const baseQuery = {};



    if (req.query.paymentMode) {
      baseQuery.paymentMode= req.query.paymentMode ;
    }


    if (req.query.expenseCategoryId) {
      baseQuery.expenseCategoryId= req.query.expenseCategoryId ;
    }


    

    if (req.query.invoiceId) {
      baseQuery.invoiceId= req.query.invoiceId;
    }


    
    // Filter by created date
    if (req.query.fromDate || req.query.toDate) {
      query.createdAt = {};
      if (req.query.fromDate) baseQuery.createdAt.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) baseQuery.createdAt.$lte = new Date(req.query.toDate);
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
    await Expense.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addexpense,
  getexpenses,
  getexpenseById,
  updateexpense,
  deleteexpense,

};
