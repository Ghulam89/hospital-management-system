const { baseUrl } = require("../config/env.config");
const DischargePatient = require("../models/dischargePatientModel");
const AdmitPatient = require("../models/admitPatientModel");
const BedDetail = require("../models/dischargePatientModel");
const RoomDetail = require("../models/dischargePatientModel");

// 1. Create dischargePatient
const adddischargePatient = async (req, res) => {
  try {



      const dischargePatient = await DischargePatient.create({ ...req.body,document:req.files.document.length==0?'': req.files?.document?.map(i=>baseUrl+i?.filename)});


      
      
          const admitPatient = await AdmitPatient.findById(req.body.admitPatientId);
      
          if (admitPatient?.allocationType === 'ward') {
            await BedDetail.findByIdAndUpdate(admitPatient?.bedDetailId, {
              status: 'available'
            })
          }
          else {
            await RoomDetail.findByIdAndUpdate(admitPatient?.roomDetailId, {
              status: 'available'
            })
          }

          await AdmitPatient.findByIdAndUpdate(req.body.admitPatientId, {
            status: false
          })


      return res.status(200).json({ status: "ok", data: dischargePatient });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all dischargePatients
const getdischargePatients = async (req, res) => {
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
    const query = {};
    
    // First find admit patients if patientId is provided
    let admitPatientQuery = {};
    if (req.query.patientId) {
      admitPatientQuery = { patientId: req.query.patientId };
    }

    if (search) {
      query['$or'] = [
        { 'admitPatientId.admissionNo': { $regex: search, $options: 'i' } },
        { 'admitPatientId.patientId': { $regex: search, $options: 'i' } }
      ];
    }

    const dischargePatients = await DischargePatient.find(query).sort({createdAt:-1})
      .populate([
        {
          path: 'admitPatientId',
          match: admitPatientQuery,  // This will filter by patientId
          populate: [
            {
              path: 'wardId',
              select: 'name'
            },
            {
              path: 'bedDetailId',
              select: 'bedNo'
            },
            
          ]
        }
      ])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const filteredDischargePatients = dischargePatients.filter(dp => dp.admitPatientId !== null);

    let countQuery = {};
    if (req.query.patientId) {
     
      const admitPatients = await AdmitPatient.find({ patientId: req.query.patientId }).select('_id');
      const admitPatientIds = admitPatients.map(ap => ap._id);
      countQuery = { admitPatientId: { $in: admitPatientIds } };
    }

    const count = await DischargePatient.countDocuments(countQuery);

    return res.status(200).json({
      status: "ok",
      data: filteredDischargePatients,
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
// 3. Get dischargePatient by id
const getdischargePatientById = async (req, res) => {
  try {
    const id = req.params.id;
    const dischargePatient = await DischargePatient.findById(id);
    return res.status(200).json({ status: "ok", data: dischargePatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update dischargePatient
const updatedischargePatient = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await DischargePatient.findById(id);

    const image =
      req.files.document === undefined
        ? getImage.document
        : req.files?.document?.map(i=>baseUrl+i?.filename);

    const updateddischargePatient = await DischargePatient.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updateddischargePatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete dischargePatient
const deletedischargePatient = async (req, res) => {
  try {
    const id = req.params.id;
    await DischargePatient.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "dischargePatient deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  adddischargePatient,
  getdischargePatients,
  getdischargePatientById,
  updatedischargePatient,
  deletedischargePatient,

};
