const BedRoomTransferHistory = require('../models/bedRoomTransferHistoryModel');
const AdmitPatient = require('../models/admitPatientModel');

function snapshotLocation(doc) {
  if (!doc) return null;
  return {
    allocationType: doc.allocationType || null,
    wardId: doc.wardId || null,
    bedDetailId: doc.bedDetailId || null,
    roomId: doc.roomId || null,
    roomDetailId: doc.roomDetailId || null,
  };
}

function locationsEqual(a, b) {
  if (!a || !b) return false;
  const keys = ['allocationType', 'wardId', 'bedDetailId', 'roomId', 'roomDetailId'];
  return keys.every((k) => String(a[k] || '') === String(b[k] || ''));
}

async function createBedRoomTransferRecord({
  admitPatientId,
  patientId,
  from,
  to,
  transferType,
  transferredById,
  notes,
}) {
  if (transferType === 'transfer' && locationsEqual(from, to)) {
    return null;
  }

  return BedRoomTransferHistory.create({
    admitPatientId,
    patientId,
    transferType: transferType || 'transfer',
    fromAllocationType: from?.allocationType || null,
    toAllocationType: to?.allocationType || null,
    fromWardId: from?.wardId || null,
    fromBedDetailId: from?.bedDetailId || null,
    fromRoomId: from?.roomId || null,
    fromRoomDetailId: from?.roomDetailId || null,
    toWardId: to?.wardId || null,
    toBedDetailId: to?.bedDetailId || null,
    toRoomId: to?.roomId || null,
    toRoomDetailId: to?.roomDetailId || null,
    transferredById: transferredById || null,
    notes: notes || '',
  });
}

async function syncMissingAdmissionHistory(patientIds) {
  const query = { status: true };
  if (Array.isArray(patientIds) && patientIds.length > 0) {
    query.patientId = { $in: patientIds };
  }

  const admits = await AdmitPatient.find(query).limit(300).lean();
  for (const admit of admits) {
    const exists = await BedRoomTransferHistory.exists({ admitPatientId: admit._id });
    if (!exists) {
      await createBedRoomTransferRecord({
        admitPatientId: admit._id,
        patientId: admit.patientId,
        from: null,
        to: snapshotLocation(admit),
        transferType: 'admission',
        transferredById: null,
        notes: 'Synced from existing admission',
      });
    }
  }
}

module.exports = {
  snapshotLocation,
  locationsEqual,
  createBedRoomTransferRecord,
  syncMissingAdmissionHistory,
};
