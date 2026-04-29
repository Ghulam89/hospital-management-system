const mongoose = require('mongoose');
const { normalizeCnic, normalizePhone } = require('../utils/patientIdentity');

/**
 * Global patient identity — NOT scoped by branch.
 * Branch-specific data belongs on Visit, Invoice, PharmPos, AdmitPatient, etc.
 *
 * Legacy documents may still contain branchId in MongoDB; new saves omit it.
 */
const patientSchema = new mongoose.Schema(
  {
    mr: {
      type: String,
      allowNull: true,
    },
    name: {
      type: String,
      allowNull: true,
    },
    gender: {
      type: String,
      allowNull: false,
    },
    phone: {
      type: String,
      allowNull: false,
    },
    phoneNormalized: {
      type: String,
      index: true,
      sparse: true,
    },
    phoneOwner: {
      type: String,
      allowNull: false,
    },
    cnic: {
      type: String,
      allowNull: false,
    },
    /** Digits-only CNIC for deduplication (unique enforced in API until legacy data is cleaned) */
    cnicNormalized: {
      type: String,
      index: true,
      sparse: true,
    },
    image: {
      type: String,
      allowNull: false,
    },
    registerDate: {
      type: Date,
      allowNull: false,
    },
    dob: {
      type: Date,
      allowNull: false,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    smsPreference: {
      type: String,
      allowNull: false,
    },
    deceased: {
      type: Boolean,
      allowNull: false,
    },
    deathDate: {
      type: Date,
      allowNull: false,
    },
    deathCause: {
      type: String,
      allowNull: false,
    },
    status: {
      type: String,
      allowNull: false,
    },
  },
  { timestamps: true },
);

patientSchema.pre('validate', function (next) {
  try {
    if (this.cnic != null && this.cnic !== '') {
      const n = normalizeCnic(this.cnic);
      this.cnicNormalized = n || undefined;
    } else {
      this.cnicNormalized = undefined;
    }
    if (this.phone != null && this.phone !== '') {
      this.phoneNormalized = normalizePhone(this.phone) || undefined;
    } else {
      this.phoneNormalized = undefined;
    }
  } catch (e) {
    return next(e);
  }
  next();
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
