const mongoose = require('mongoose');

const storeClosingSchema = new mongoose.Schema({
  closingDate: {
    type: Date,
    required: true,
  },
  openingCash: {
    type: Number,
    required: true,
  },
  totalSales: {
    type: Number,
    required: true,
    default: 0,
  },
  totalExpenses: {
    type: Number,
    required: true,
    default: 0,
  },
  cashInHand: {
    type: Number,
    required: true,
  },
  expectedCash: {
    type: Number,
    required: true,
  },
  difference: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    default: 'Closed',
  },
}, { timestamps: true });

// Pre-save middleware to calculate expectedCash and difference
storeClosingSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('openingCash') || this.isModified('totalSales') || this.isModified('totalExpenses')) {
    this.expectedCash = this.openingCash + this.totalSales - this.totalExpenses;
  }
  
  if (this.isNew || this.isModified('cashInHand') || this.isModified('expectedCash')) {
    this.difference = this.cashInHand - this.expectedCash;
  }
  
  next();
});

const StoreClosing = mongoose.model('StoreClosing', storeClosingSchema);

module.exports = StoreClosing;
