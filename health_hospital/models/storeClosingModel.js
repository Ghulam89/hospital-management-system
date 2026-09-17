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
  cashSales: {
    type: Number,
    default: 0,
  },
  onlineCash: {
    type: Number,
    default: 0,
  },
  cardTransactions: {
    type: Number,
    default: 0,
  },
  creditSales: {
    type: Number,
    default: 0,
  },
  chequePayments: {
    type: Number,
    default: 0,
  },
  cashDeposit: {
    type: Number,
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
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
  },
}, { timestamps: true });

function calcExpectedCash(doc) {
  const opening = Number(doc.openingCash) || 0;
  const cashSales = Number(doc.cashSales) || 0;
  const expenses = Number(doc.totalExpenses) || 0;
  const deposit = Number(doc.cashDeposit) || 0;
  return opening + cashSales - expenses - deposit;
}

// Pre-save middleware to calculate expectedCash and difference
storeClosingSchema.pre('save', function (next) {
  if (
    this.isNew ||
    this.isModified('openingCash') ||
    this.isModified('cashSales') ||
    this.isModified('totalExpenses') ||
    this.isModified('cashDeposit')
  ) {
    this.expectedCash = calcExpectedCash(this);
  }

  if (this.isNew || this.isModified('cashInHand') || this.isModified('expectedCash')) {
    this.difference = this.cashInHand - this.expectedCash;
  }

  next();
});

storeClosingSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const setDoc = update.$set || update;
  const merged = { ...setDoc };

  if (
    merged.openingCash !== undefined ||
    merged.cashSales !== undefined ||
    merged.totalExpenses !== undefined ||
    merged.cashDeposit !== undefined
  ) {
    const expectedCash = calcExpectedCash(merged);
    if (update.$set) {
      update.$set.expectedCash = expectedCash;
      if (merged.cashInHand !== undefined) {
        update.$set.difference = Number(merged.cashInHand) - expectedCash;
      }
    } else {
      update.expectedCash = expectedCash;
      if (merged.cashInHand !== undefined) {
        update.difference = Number(merged.cashInHand) - expectedCash;
      }
    }
  } else if (merged.cashInHand !== undefined && merged.expectedCash !== undefined) {
    const diff = Number(merged.cashInHand) - Number(merged.expectedCash);
    if (update.$set) update.$set.difference = diff;
    else update.difference = diff;
  }

  next();
});

const StoreClosing = mongoose.model('StoreClosing', storeClosingSchema);

module.exports = StoreClosing;
