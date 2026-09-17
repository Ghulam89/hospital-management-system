const mongoose = require('mongoose');

const bedRoomTransferHistorySchema = new mongoose.Schema(
  {
    admitPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdmitPatient',
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    transferType: {
      type: String,
      enum: ['admission', 'transfer'],
      default: 'transfer',
    },
    fromAllocationType: { type: String, allowNull: true },
    toAllocationType: { type: String, allowNull: true },
    fromWardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
    fromBedDetailId: { type: mongoose.Schema.Types.ObjectId, ref: 'BedDetail' },
    fromRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    fromRoomDetailId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomDetail' },
    toWardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
    toBedDetailId: { type: mongoose.Schema.Types.ObjectId, ref: 'BedDetail' },
    toRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    toRoomDetailId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomDetail' },
    transferredById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, allowNull: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('BedRoomTransferHistory', bedRoomTransferHistorySchema);
