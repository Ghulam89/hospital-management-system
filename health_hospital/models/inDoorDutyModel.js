const mongoose = require('mongoose');

const inDoorDutySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dutyDate: {
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
  dutyDay: {
    type: String,
    required: true,
  },
  status: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('InDoorDuty', inDoorDutySchema);
