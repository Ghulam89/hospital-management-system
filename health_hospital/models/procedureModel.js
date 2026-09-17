const mongoose = require('mongoose');

const doctorShareSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    share: { type: Number, default: 0 },
    shareType: { type: String, enum: ['value', 'percentage'], default: 'percentage' },
  },
  { _id: false },
);

const defaultExpenseSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    expenseCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory' },
    amount: { type: Number, default: 0 },
    deductBeforeDoctorShare: { type: Boolean, default: false },
    showInPrint: { type: Boolean, default: false },
  },
  { _id: false },
);

const consumptionSchema = new mongoose.Schema(
  {
    pharmItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmItem' },
    qty: { type: Number, default: 1 },
    batchNumber: { type: String, default: '' },
  },
  { _id: false },
);

const procedureSchema = new mongoose.Schema(
  {
    name: { type: String, allowNull: true },
    amount: { type: String, allowNull: true },
    cost: { type: Number, allowNull: true, default: 0 },
    description: { type: String, allowNull: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    /** Set when a branch user creates the row; null = hospital-wide catalog (super admin). */
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subDepartment: { type: String, default: '' },
    discount: { type: Number, default: 0 },
    discountType: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    doctorShares: { type: [doctorShareSchema], default: [] },
    defaultExpenses: { type: [defaultExpenseSchema], default: [] },
    consumptions: { type: [consumptionSchema], default: [] },
    /** Soft lifecycle — inactive procedures stay on old invoices but are hidden from pickers by default. */
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

const procedure = mongoose.model('Procedure', procedureSchema);

module.exports = procedure;
