const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    /** When true, Super Admin defined this row for a branch; branch admins do not list or edit it. Branch-created roles use false. */
    createdBySuperAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

/** One row per (key, branch): global templates use branchId `null`; each branch may reuse the same key. */
roleSchema.index({ key: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
