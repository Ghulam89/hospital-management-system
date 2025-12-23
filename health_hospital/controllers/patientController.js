const Patient = require("../models/patientModel");

// 1. Create patient
const addpatient = async (req, res) => {
  try {


    const checkPhone = await Patient.findOne({ phone: req.body.phone });
    const checkcnic = await Patient.findOne({ cnic: req.body.cnic });

    if (req.body.cnic && checkcnic) {
      return res
        .status(500)
        .json({ status: "fail", message: "Cnic already exist!" });
    }
    else if (req.body.phone && checkPhone) {
      return res
        .status(500)
        .json({ status: "fail", message: "Phone already exist!" });
    }
    else {

      const image =
        req.files.image === undefined
          ? ''
          : req.files.image[0].filename;


      const patient = await Patient.create({ ...req.body, image });
      return res.status(200).json({ status: "ok", data: patient });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getpatients = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      gender,
      mr,
      name,
      phone,
      cnic,
      phoneOwner,
      dob,
      status,
      fromDate,
      toDate
    } = req.query;

    const limit = 20;
    const query = {};

    // Basic search filter
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { cnic: { $regex: search, $options: "i" } },
        { mr: { $regex: search, $options: "i" } },
      ];
    }

    // Individual field filters based on schema
    if (mr && mr.trim() !== '') {
      query.mr = { $regex: mr, $options: "i" };
    }

    if (name && name.trim() !== '') {
      query.name = { $regex: name, $options: "i" };
    }

    if (phone && phone.trim() !== '') {
      query.phone = { $regex: phone, $options: "i" };
    }

    if (cnic && cnic.trim() !== '') {
      query.cnic = { $regex: cnic, $options: "i" };
    }

    if (phoneOwner && phoneOwner.trim() !== '') {
      query.phoneOwner = { $regex: phoneOwner, $options: "i" };
    }

    if (gender && gender.trim() !== '') {
      query.gender = gender;
    }

    if (dob && dob.trim() !== '') {
      query.dob = dob;
    }

   

    if (status && status.trim() !== '') {
      query.status = status;
    }

    // Date range filter for createdAt (timestamps)
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate && fromDate.trim() !== '') {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate && toDate.trim() !== '') {
        query.createdAt.$lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }

    console.log('Patient query:', JSON.stringify(query, null, 2));

    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .populate(['doctorId'])
      .limit(limit)
      .skip((parseInt(page) - 1) * limit)
      .exec();

    const count = await Patient.countDocuments(query);

    console.log('Found patients:', patients.length);

    return res.status(200).json({
      status: "ok",
      data: patients,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      limit
    });
  } catch (err) {
    console.error('Patient fetch error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 3. Get patient by id
const getpatientById = async (req, res) => {
  try {
    const id = req.params.id;
    const patient = await Patient.findById(id);
    return res.status(200).json({ status: "ok", data: patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update patient
const updatepatient = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await Patient.findById(id);
    const image =
      req.files.image === undefined
        ? getImage.image
        : req.files.image[0].filename;

    const updatedpatient = await Patient.findByIdAndUpdate(
      id,
      { ...req.body, image: image },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updatedpatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete patient
const deletepatient = async (req, res) => {
  try {
    const id = req.params.id;
    await Patient.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "patient deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpatient,
  getpatients,
  getpatientById,
  updatepatient,
  deletepatient,

};
