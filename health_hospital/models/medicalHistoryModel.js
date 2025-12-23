const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  alert: {
    type: Boolean,
    required: false,
  },
  
}, { timestamps: true });

module.exports = mongoose.model('MedicalHistory', medicalHistorySchema);
