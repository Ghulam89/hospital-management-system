const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorName: { type: String, default: '' },
    actorEmail: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    module: { type: String, default: '', index: true },
    action: { type: String, required: true, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, default: 200 },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true },
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ branchId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
