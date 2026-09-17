const AdmitPatient = require("../models/admitPatientModel");
const BedDetail = require("../models/bedDetailModel");
const RoomDetail = require("../models/roomDetailModel");
const { getScopedPatientIds, patientVisibleForRequest } = require("../utils/branchScope");
const {
  snapshotLocation,
  createBedRoomTransferRecord,
} = require("../utils/bedRoomTransferHistory");

async function resolveNextAdmissionNo() {
  const rows = await AdmitPatient.find({
    admissionNo: { $exists: true, $nin: [null, ""] },
  })
    .select("admissionNo")
    .lean();

  let max = 0;
  for (const row of rows) {
    const raw = String(row.admissionNo || "").trim();
    const match = raw.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }

  return `ADM${String(max + 1).padStart(6, "0")}`;
}

const getNextAdmissionNo = async (req, res) => {
  try {
    const nextAdmissionNo = await resolveNextAdmissionNo();
    return res.status(200).json({ status: "ok", nextAdmissionNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 1. Create admitPatient
const addadmitPatient = async (req, res) => {
  try {

    if (req.body.patientId && !(await patientVisibleForRequest(req, req.body.patientId))) {
      return res.status(403).json({ status: "fail", message: "Patient not allowed for this branch" });
    }

    const payload = { ...req.body };
    payload.admissionNo = await resolveNextAdmissionNo();

    const admitPatient = await AdmitPatient.create(payload);

    await createBedRoomTransferRecord({
      admitPatientId: admitPatient._id,
      patientId: admitPatient.patientId,
      from: null,
      to: snapshotLocation(admitPatient),
      transferType: "admission",
      transferredById: req.user?._id,
    });

    if (req.body.allocationType === 'ward') {
      await BedDetail.findByIdAndUpdate(req.body.bedDetailId, {
        status: 'unavailable'
      })
    }
    else {
      await RoomDetail.findByIdAndUpdate(req.body.roomDetailId, {
        status: 'unavailable'
      })
    }

    return res.status(200).json({ status: "ok", data: admitPatient });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all admitPatients
const getadmitPatients = async (req, res) => {
  try {




    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    var page = "1";
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = "20";

    var query = {}

    if (req.query.patientId) {
      query.patientId = req.query.patientId
    }

    if (req.query.doctorId) {
      query.doctorId = req.query.doctorId
    }

    if (req.query.allocationType) {
      query.allocationType = req.query.allocationType
    }

    if (req.query.bedDetailId) {
      query.bedDetailId = req.query.bedDetailId
    }

    if (req.query.wardId) {
      query.wardId = req.query.wardId
    }

    if (req.query.roomId) {
      query.roomId = req.query.roomId
    }

    if (req.query.status) {
      query.status = req.query.status
    }

    const scopedPids = await getScopedPatientIds(req);
    if (scopedPids !== null) {
      if (scopedPids.length === 0) {
        return res.status(200).json({
          status: "ok",
          data: [],
          search,
          page,
          count: 0,
          totalPages: 0,
          currentPage: page,
          limit
        });
      }
      if (query.patientId) {
        if (!scopedPids.some((x) => String(x) === String(query.patientId))) {
          return res.status(200).json({
            status: "ok",
            data: [],
            search,
            page,
            count: 0,
            totalPages: 0,
            currentPage: page,
            limit
          });
        }
      } else {
        query.patientId = { $in: scopedPids };
      }
    }

    console.log(query);


    const admitPatients = await AdmitPatient.find(query).sort({createdAt:-1})
      .populate(['patientId', 'wardId', 'bedDetailId', 'roomId', 'roomDetailId', 'doctorId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await AdmitPatient.find(query)
      .populate(['patientId', 'wardId', 'bedDetailId', 'roomId', 'roomDetailId', 'doctorId'])
      .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: admitPatients,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Get admitPatient by id
const getadmitPatientById = async (req, res) => {
  try {
    const id = req.params.id;
    const admitPatient = await AdmitPatient.findById(id)
      .populate(["patientId", "wardId", "bedDetailId", "roomId", "roomDetailId", "doctorId"])
      .lean();
    if (!admitPatient) {
      return res.status(404).json({ status: "fail", message: "Admit patient not found" });
    }
    if (admitPatient.patientId && !(await patientVisibleForRequest(req, admitPatient.patientId))) {
      return res.status(404).json({ status: "fail", message: "Admit patient not found" });
    }
    return res.status(200).json({ status: "ok", data: admitPatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update admitPatient
const updateadmitPatient = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await AdmitPatient.findById(id);
    if (!getImage) {
      return res.status(404).json({ status: "fail", message: "Admit patient not found" });
    }
    if (getImage.patientId && !(await patientVisibleForRequest(req, getImage.patientId))) {
      return res.status(404).json({ status: "fail", message: "Admit patient not found" });
    }
    if (req.body.patientId && !(await patientVisibleForRequest(req, req.body.patientId))) {
      return res.status(403).json({ status: "fail", message: "Patient not allowed for this branch" });
    }

    const fromLocation = snapshotLocation(getImage);
    const mergedLocation = snapshotLocation({
      ...getImage.toObject(),
      ...req.body,
    });

    const updatedadmitPatient = await AdmitPatient.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );


    if (getImage.allocationType === 'ward') {
      await BedDetail.findByIdAndUpdate(getImage.bedDetailId, {
        status: 'available'
      })
    }
    else {
      await RoomDetail.findByIdAndUpdate(getImage.roomDetailId, {
        status: 'available'
      })
    }



    if (req.body.allocationType === 'ward') {
      if (req.body.bedDetailId) {
        await BedDetail.findByIdAndUpdate(getImage.bedDetailId, {
          status: 'available'
        })
        await BedDetail.findByIdAndUpdate(req.body.bedDetailId, {
          status: 'unavailable'
        })
      } else {
        await BedDetail.findByIdAndUpdate(getImage.bedDetailId, {
          status: 'unavailable'
        })
      }
    }
    else {

      if (req.body.roomDetailId) {
        await RoomDetail.findByIdAndUpdate(getImage.roomDetailId, {
          status: 'available'
        })
        await RoomDetail.findByIdAndUpdate(req.body.roomDetailId, {
          status: 'unavailable'
        })
      }
      else{
        await RoomDetail.findByIdAndUpdate(getImage.roomDetailId, {
          status: 'unavailable'
        })
      }
    }

    await createBedRoomTransferRecord({
      admitPatientId: id,
      patientId: updatedadmitPatient.patientId || getImage.patientId,
      from: fromLocation,
      to: mergedLocation,
      transferType: "transfer",
      transferredById: req.user?._id,
      notes: req.body.transferNotes || "",
    });

    return res.status(200).json({ status: "ok", data: updatedadmitPatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete admitPatient
const deleteadmitPatient = async (req, res) => {
  try {
    const id = req.params.id;

    let admitPatientData = await AdmitPatient.findById(id)
    if (!admitPatientData) {
      return res.status(404).json({ status: "fail", message: "Admit patient not found" });
    }
    if (admitPatientData.patientId && !(await patientVisibleForRequest(req, admitPatientData.patientId))) {
      return res.status(404).json({ status: "fail", message: "Admit patient not found" });
    }



    if (admitPatientData.allocationType === 'ward') {
      await BedDetail.findByIdAndUpdate(admitPatientData.bedDetailId, {
        status: 'available'
      })
    }
    else {
      await RoomDetail.findByIdAndUpdate(admitPatientData.roomDetailId, {
        status: 'available'
      })
    }


    await AdmitPatient.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "admitPatient deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addadmitPatient,
  getadmitPatients,
  getadmitPatientById,
  updateadmitPatient,
  deleteadmitPatient,
  getNextAdmissionNo,
};
