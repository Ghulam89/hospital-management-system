const ExpenseCategory = require("../models/expenseCategoryModel");

// 1. Create expenseCategory
const addexpenseCategory = async (req, res) => {
  try {



      const data = await ExpenseCategory.create({ ...req.body });
      return res.status(200).json({ status: "ok", data: data });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getexpenseCategorys = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit?req.query?.limit:20;

    // Create base query with optional gender filter
    const baseQuery = {};


    const data = await ExpenseCategory.find(baseQuery).sort({createdAt:-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await ExpenseCategory.countDocuments(baseQuery);

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

// 3. Get expenseCategory by id
const getexpenseCategoryById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await ExpenseCategory.findById(id);
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update expenseCategory
const updateexpenseCategory = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await ExpenseCategory.findById(id);
    

    const data = await ExpenseCategory.findByIdAndUpdate(
      id,
      { ...req.body,  },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete expenseCategory
const deleteexpenseCategory = async (req, res) => {
  try {
    const id = req.params.id;
    await ExpenseCategory.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Expense Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addexpenseCategory,
  getexpenseCategorys,
  getexpenseCategoryById,
  updateexpenseCategory,
  deleteexpenseCategory,

};
