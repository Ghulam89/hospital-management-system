const mongoose = require('mongoose');

/**
 * Branch-scoped clinical encounter. One global Patient may have many Visits (one per branch visit).
 * Links optional Token / Appointment / Admission for legacy integration.
 */
const visitSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    visitType: {
      type: String,
      enum: ['OPD', 'IPD', 'Emergency', 'Lab', 'Pharmacy', 'Other'],
      default: 'OPD',
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'cancelled'],
      default: 'open',
    },
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    admitPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdmitPatient',
    },
    chiefComplaint: {
      type: String,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

visitSchema.index({ patientId: 1, branchId: 1, createdAt: -1 });
visitSchema.index({ branchId: 1, createdAt: -1 });

const Visit = mongoose.model('Visit', visitSchema);

module.exports = Visit;
