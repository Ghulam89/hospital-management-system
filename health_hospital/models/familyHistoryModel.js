const mongoose = require('mongoose');

const familyHistorySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  age: {
    type: String,
    required: true,
  },
  bloodGroup: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  diagnosis: {
    type: String,
    required: true,
  },
  relationship: {
    type: String,
    required: true,
  },
  remarks: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('FamilyHistory', familyHistorySchema);
