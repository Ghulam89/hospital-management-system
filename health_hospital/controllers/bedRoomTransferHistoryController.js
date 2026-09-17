const BedRoomTransferHistory = require('../models/bedRoomTransferHistoryModel');
const Patient = require('../models/patientModel');
const AdmitPatient = require('../models/admitPatientModel');
const { getScopedPatientIds} = require("../utils/branchScope");
const { syncMissingAdmissionHistory } = require('../utils/bedRoomTransferHistory');

const populatePaths = [
  { path: 'patientId', select: 'name mr phone' },
  { path: 'admitPatientId', select: 'admissionNo admissionDate status allocationType' },
  { path: 'fromWardId', select: 'name' },
  { path: 'fromBedDetailId', select: 'bedNo' },
  { path: 'fromRoomId', select: 'name' },
  { path: 'fromRoomDetailId', select: 'roomNo' },
  { path: 'toWardId', select: 'name' },
  { path: 'toBedDetailId', select: 'bedNo' },
  { path: 'toRoomId', select: 'name' },
  { path: 'toRoomDetailId', select: 'roomNo' },
  { path: 'transferredById', select: 'name' },
];

function intersectPatientIds(candidateIds, scopedPids) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return [];
  if (scopedPids === null) return candidateIds;
  const allowed = new Set(scopedPids.map((id) => String(id)));
  return candidateIds.filter((id) => allowed.has(String(id)));
}

async function resolveSearchPatientIds(searchTerm, scopedPids) {
  const term = String(searchTerm || '').trim();
  if (!term) return [];

  const patients = await Patient.find({
    $or: [
      { mr: { $regex: term, $options: 'i' } },
      { name: { $regex: term, $options: 'i' } },
      { phone: { $regex: term, $options: 'i' } },
      { cnic: { $regex: term, $options: 'i' } },
    ] })
    .select('_id')
    .limit(200)
    .lean();

  const admits = await AdmitPatient.find({
    admissionNo: { $regex: term, $options: 'i' } })
    .select('_id patientId')
    .limit(200)
    .lean();

  const ids = new Set();
  for (const p of patients) {
    if (p?._id) ids.add(String(p._id));
  }
  for (const a of admits) {
    if (a?.patientId) ids.add(String(a.patientId));
  }

  return intersectPatientIds([...ids], scopedPids);
}

async function resolveSearchAdmitIds(searchTerm, scopedPids) {
  const term = String(searchTerm || '').trim();
  if (!term) return [];

  const admits = await AdmitPatient.find({
    admissionNo: { $regex: term, $options: 'i' } })
    .select('_id patientId')
    .limit(200)
    .lean();

  const allowedPatientIds = new Set(
    intersectPatientIds(
      admits.map((a) => a.patientId).filter(Boolean),
      scopedPids,
    ).map(String),
  );

  return admits
    .filter((a) => {
      if (scopedPids === null) return true;
      return a.patientId && allowedPatientIds.has(String(a.patientId));
    })
    .map((a) => a._id);
}

const getTransferHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = String(req.query.search || '').trim();
    const query = {};

    const scopedPids = await getScopedPatientIds(req);

    if (search) {
      const searchPatientIds = await resolveSearchPatientIds(search, scopedPids);
      const searchAdmitIds = await resolveSearchAdmitIds(search, scopedPids);

      if (searchPatientIds.length === 0 && searchAdmitIds.length === 0) {
        return res.status(200).json({
          status: 'ok',
          data: [],
          page,
          count: 0,
          totalPages: 0,
          currentPage: page,
          limit });
      }

      await syncMissingAdmissionHistory(searchPatientIds);

      const searchClauses = [];
      if (searchPatientIds.length > 0) {
        searchClauses.push({ patientId: { $in: searchPatientIds } });
      }
      if (searchAdmitIds.length > 0) {
        searchClauses.push({ admitPatientId: { $in: searchAdmitIds } });
      }
      query.$or = searchClauses;
    } else if (req.query.patientId) {
      query.patientId = req.query.patientId;
      await syncMissingAdmissionHistory([req.query.patientId]);
    }

    if (req.query.admitPatientId) {
      query.admitPatientId = req.query.admitPatientId;
    }
    if (req.query.transferType) {
      query.transferType = req.query.transferType;
    }
    if (req.query.wardId) {
      const wardId = req.query.wardId;
      const wardClause = { $or: [{ fromWardId: wardId }, { toWardId: wardId }] };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, wardClause];
        delete query.$or;
      } else {
        Object.assign(query, wardClause);
      }
    }
    if (req.query.roomId) {
      const roomId = req.query.roomId;
      const roomClause = { $or: [{ fromRoomId: roomId }, { toRoomId: roomId }] };
      if (query.$and) {
        query.$and.push(roomClause);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, roomClause];
        delete query.$or;
      } else {
        Object.assign(query, roomClause);
      }
    }

    if (scopedPids !== null) {
      if (scopedPids.length === 0) {
        return res.status(200).json({
          status: 'ok',
          data: [],
          page,
          count: 0,
          totalPages: 0,
          currentPage: page,
          limit });
      }
      if (query.patientId) {
        if (!scopedPids.some((x) => String(x) === String(query.patientId))) {
          return res.status(200).json({
            status: 'ok',
            data: [],
            page,
            count: 0,
            totalPages: 0,
            currentPage: page,
            limit });
        }
      } else if (!search) {
        query.patientId = { $in: scopedPids };
      } else if (query.$or) {
        // search already limited to scoped patient ids
      } else if (query.$and) {
        query.$and.push({ patientId: { $in: scopedPids } });
      }
    }

    if (!search && !req.query.patientId) {
      await syncMissingAdmissionHistory(scopedPids);
    }

    const count = await BedRoomTransferHistory.countDocuments(query);
    const data = await BedRoomTransferHistory.find(query)
      .sort({ createdAt: -1 })
      .populate(populatePaths)
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    return res.status(200).json({
      status: 'ok',
      data,
      page,
      count,
      totalPages: Math.ceil(count / limit) || 0,
      currentPage: page,
      limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTransferHistory };
