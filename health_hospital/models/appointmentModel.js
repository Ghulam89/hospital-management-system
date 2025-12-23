const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  procedureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure',
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  appointmentDate: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  consultationType: {
    type: String,
    enum: ['Inperson', 'Video'],
    required: true,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  repeatEvery: {
    type: Number,
    default: 1,
  },
  repeatUnit: {
    type: String,
    enum: ['Day', 'Week', 'Month'],
  },
  repeatDays: {
    type: [String],
  },
  endsOn: {
    type: Date,
  },
  appointmentStatus: {
    type: String,
    default: 'Scheduled',
  },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
