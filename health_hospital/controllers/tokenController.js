const Token = require("../models/tokenModel");
const User = require("../models/userModel");

// 1. Create Detail
const addDetail = async (req, res) => {
  try {

    if(!req.body.doctorId){
      return res
        .status(500)
        .json({ status: "fail", message: "Please select doctor!" });
    }


    if(!req.body.patientId){
      return res
        .status(500)
        .json({ status: "fail", message: "Please select patient!" });
    }


    if(!req.body.tokenNumber){
      return res
        .status(500)
        .json({ status: "fail", message: "Must select token number!" });
    }


    if(!req.body.tokenDate){
      return res
        .status(500)
        .json({ status: "fail", message: "Must provide token date!" });
    }


    const checkNo = await Token.findOne({ tokenNumber: req.body.tokenNumber, tokenDate:req.body.tokenDate, doctorId: req.body.doctorId,  });

    if (checkNo) {
      return res
        .status(500)
        .json({ status: "fail", message: "Token number already register!" });
    }
    else {


      const Detail = await Token.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: Detail });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all Details
const getDetails = async (req, res) => {
  try {
    var search = req.query.search || "";
    var page = req.query.page || "1";
    const limit = 20;

    let query = {};

    if (req.query.doctorId) {
      query.doctorId = req.query.doctorId;
    }

    if (req.query.patientId) {
      query.patientId = req.query.patientId;
    }

    // Filter by date
    const today = req.query.today === "true";
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    if (today) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      query.tokenDate = { $gte: start, $lte: end };
    } 
    
    if (fromDate && toDate) {
      query.tokenDate = {
        $gte: new Date(new Date(fromDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
      };
    }

    const Details = await Token.find(query).sort({createdAt:-1})
      .populate(['doctorId', 'patientId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Token.countDocuments(query);

    return res.status(200).json({
      status: "ok",
      data: Details,
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




const getTokensOpdReport = async (req, res) => {
  try {
    let {
      doctorId,
      status,
      procedureId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Build filter query
    const filter = {};

    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.tokenSatus = status;
    if (procedureId) filter.procedureId = procedureId;

    if (startDate || endDate) {
      filter.tokenDate = {};
      if (startDate) filter.tokenDate.$gte = new Date(startDate);
      if (endDate) filter.tokenDate.$lte = new Date(endDate);
    }

    // Count total filtered appointments (Total OPD card)
    const totalAppointments = await Token.countDocuments(filter);

    // Get paginated appointments with population
    const appointments = await Token.find(filter).sort({createdAt:-1})
      .populate('doctorId', 'name') // populate doctor name only
      .populate('patientId', 'name phone dob mr') // patient fields
      .populate('procedureId', 'name') // procedure name
      .sort({ tokenDate: -1, startTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Calculate Dr with Most OPD in filtered appointments (can be optimized but simple here)
    // Count frequency of doctorId in filtered data (all filtered, not just page)
    const allAppointmentsForDoctorCount = await Token.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$doctorId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    let topDoctor = null;
    if (allAppointmentsForDoctorCount.length > 0) {
      // Fetch doctor name for the top doctor
      topDoctor = await User.findById(allAppointmentsForDoctorCount[0]._id).select('name').lean();
    }

    // Response with cards + data
    res.status(200).json({
      status: 'ok',
      page,
      limit,
      totalAppointments,
      totalPages: Math.ceil(totalAppointments / limit),
      topDoctor: topDoctor ? { id: topDoctor._id, name: topDoctor.name } : null,
      data: appointments.map(app => ({
        id: app._id,
        tokenDate: app.tokenDate,
        tokenSatus: app.tokenSatus,
        doctor: app.doctorId ? { id: app.doctorId._id, name: app.doctorId.name } : null,
        patient: app.patientId
          ? {
              id: app.patientId._id,
              name: app.patientId.name,
              phone: app.patientId.phone,
              dob: app.patientId.dob,
              mrNumber: app.patientId.mr,
            }
          : null,
        procedure: app.procedureId ? { id: app.procedureId._id, name: app.procedureId.name } : null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};






const getDoctorsWithTokenCount = async (req, res) => {
  try {
    let {
      status,
      procedureId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Build filter for appointments (to count)
    const appointmentFilter = {};
    if (status) appointmentFilter.tokenSatus = status;
    if (procedureId) appointmentFilter.procedureId = mongoose.Types.ObjectId(procedureId);
    if (startDate || endDate) {
      appointmentFilter.tokenDate = {};
      if (startDate) appointmentFilter.tokenDate.$gte = new Date(startDate);
      if (endDate) appointmentFilter.tokenDate.$lte = new Date(endDate);
    }

    // Aggregate appointments to count per doctor
    const appointmentCounts = await Token.aggregate([
      { $match: appointmentFilter },
      {
        $group: {
          _id: '$doctorId',
          appointmentCount: { $sum: 1 },
        },
      },
    ]);

    // Convert counts to a map for easy lookup
    const countMap = {};
    appointmentCounts.forEach(item => {
      countMap[item._id.toString()] = item.appointmentCount;
    });

    // Get doctors with pagination
    const totalDoctors = await User.countDocuments({ role: 'doctor' }); // assuming role field
    const doctors = await User.find({ role: 'doctor' }).sort({createdAt:-1})
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name email') // select fields you want
      .lean();

    // Add appointment counts to doctors
    const doctorsWithCounts = doctors.map(doc => ({
      id: doc._id,
      name: doc.name,
      email: doc.email,
      tokenCount: countMap[doc._id.toString()] || 0,
    }));

    res.status(200).json({
      status: 'ok',
      page,
      limit,
      totalDoctors,
      totalPages: Math.ceil(totalDoctors / limit),
      data: doctorsWithCounts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};




// 3. Get Detail by id
const getUnassignedTokenList = async (req, res) => {
  try {
    const { tokenDate, doctorId } = req.query;

    // Find already booked tokens for the given date and doctor
    const bookedTokens = await Token.find(
      { tokenDate, doctorId },
      'tokenNumber' // Only return tokenNumber field
    ).sort({createdAt:-1});

    // Extract token numbers into an array
    const bookedTokenNumbers = bookedTokens.map(t => t.tokenNumber);

    // Generate all token numbers from 1 to 100
    const allTokens = Array.from({ length: 100 }, (_, i) => i + 1);

    // Filter out the booked ones
    const unassignedTokens = allTokens.filter(
      token => !bookedTokenNumbers.includes(token)
    );

    res.status(200).json({
      status: "ok",
      data: unassignedTokens,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// 3. Get Detail by id
const getDetailById = async (req, res) => {
  try {
    const id = req.params.id;
    const Detail = await Token.findById(id);
    return res.status(200).json({ status: "ok", data: Detail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update Detail
const updateDetail = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await Token.findById(id);

    const updatedDetail = await Token.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updatedDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete Detail
const deleteDetail = async (req, res) => {
  try {
    const id = req.params.id;
    await Token.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Detail deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addDetail,
  getDetails,
  getDetailById,
  updateDetail,
  deleteDetail,
  getUnassignedTokenList,
  getDoctorsWithTokenCount,
  getTokensOpdReport
};
