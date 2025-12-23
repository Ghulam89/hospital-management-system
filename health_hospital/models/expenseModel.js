const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    image: {
        type: String,
        allowNull: true,
    },
    description: {
        type: String,
        allowNull: true,
    },
    paymentMode: {
        type: String,
        allowNull: true,
    },
    amount: {
        type: Number,
        allowNull: true,
    },
    expenseCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'ExpenseCategory',
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Invoice',
    },
},{timestamps:true});


const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
