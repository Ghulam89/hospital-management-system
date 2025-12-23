const AdmitPatient = require("../models/admitPatientModel");
const BedDetail = require("../models/bedDetailModel");
const RoomDetail = require("../models/roomDetailModel");

// 1. Create admitPatient
const addadmitPatient = async (req, res) => {
  try {




    const admitPatient = await AdmitPatient.create({ ...req.body });

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
    const admitPatient = await AdmitPatient.findById(id);
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

};
