const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    address: { type: String, trim: true },
    /** City / area / landmark (separate from street address if needed) */
    location: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

branchSchema.index({ name: 1 }, { unique: true });
branchSchema.index({ code: 1 }, { unique: true, sparse: true });

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
