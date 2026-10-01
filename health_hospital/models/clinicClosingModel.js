const mongoose = require('mongoose');

/**
 * Clinic day closing — one row per (branch, calendar day, closedBy user).
 * Receptionists close separately (3 reception → 3 closings).
 */
const clinicClosingSchema = new mongoose.Schema(
  {
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
      index: true,
    },
    status: {
      type: String,
      default: 'Closed',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
  },
  { timestamps: true },
);

clinicClosingSchema.index({ branchId: 1, closedBy: 1, closingDate: 1 });

function calcExpectedCash(doc) {
  const opening = Number(doc.openingCash) || 0;
  const cashSales = Number(doc.cashSales) || 0;
  const expenses = Number(doc.totalExpenses) || 0;
  const deposit = Number(doc.cashDeposit) || 0;
  return opening + cashSales - expenses - deposit;
}

clinicClosingSchema.pre('save', function (next) {
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

clinicClosingSchema.pre('findOneAndUpdate', function (next) {
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

module.exports = mongoose.model('ClinicClosing', clinicClosingSchema);
