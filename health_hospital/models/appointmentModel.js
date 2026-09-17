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
    index: true,
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
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    index: true,
  },
}, { timestamps: true });

appointmentSchema.index({ branchId: 1, appointmentDate: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentStatus: 1 });
appointmentSchema.index({ branchId: 1, patientId: 1 });
appointmentSchema.index({ branchId: 1, doctorId: 1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
