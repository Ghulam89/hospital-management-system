const mongoose = require("mongoose");
const Token = require("../models/tokenModel");
const User = require("../models/userModel");
const Patient = require("../models/patientModel");
const Visit = require("../models/visitModel");
const { normalizeRole } = require("../middleware/auth");
const {
  applyPatientIdScopeToQuery,
  patientVisibleForRequest,
  resolveBranchIdForNonSuperAdmin,
  applyStrictBranchListFilter,
  branchDocumentVisible,
} = require("../utils/branchScope");

// 1. Create Detail
const addDetail = async (req, res) => {
  try {
    let allowed = await patientVisibleForRequest(req, req.body.patientId);
    if (!allowed && req.body.patientId && req.user) {
      const p = await Patient.findById(req.body.patientId).select("_id").lean();
      const role = normalizeRole(req.user.role);
      let bid = null;
      if (role === "superadmin") {
        const raw = req.body.branchId || req.query?.branchId;
        if (raw != null && raw !== "" && mongoose.Types.ObjectId.isValid(String(raw))) {
          bid = new mongoose.Types.ObjectId(String(raw));
        }
      } else {
        bid = await resolveBranchIdForNonSuperAdmin(req);
      }
      if (p && bid) {
        const has = await Visit.findOne({ patientId: p._id, branchId: bid }).select("_id").lean();
        if (!has) {
          await Visit.create({
            patientId: p._id,
            branchId: bid,
            visitType: "OPD",
            status: "open",
            createdById: req.user._id,
          });
        }
        allowed = true;
      }
    }

    if (!allowed) {
      return res
        .status(403)
        .json({ status: "fail", message: "Patient not allowed for this branch" });
    }


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


    const role = normalizeRole(req.user?.role);
    let branchIdForToken = req.body.branchId;
    if (role === "superadmin") {
      const raw = branchIdForToken || req.query?.branchId;
      if (raw != null && raw !== "" && mongoose.Types.ObjectId.isValid(String(raw))) {
        branchIdForToken = new mongoose.Types.ObjectId(String(raw));
      } else {
        branchIdForToken = undefined;
      }
    } else {
      branchIdForToken = await resolveBranchIdForNonSuperAdmin(req);
    }

    const dupQuery = {
      tokenNumber: req.body.tokenNumber,
      tokenDate: req.body.tokenDate,
      doctorId: req.body.doctorId,
    };
    if (branchIdForToken) {
      dupQuery.branchId = branchIdForToken;
    }

    const checkNo = await Token.findOne(dupQuery);

    if (checkNo) {
      return res
        .status(500)
        .json({ status: "fail", message: "Token number already register!" });
    }

    const Detail = await Token.create({ ...req.body, branchId: branchIdForToken });
    return res.status(200).json({ status: "ok", data: Detail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all Details
const getDetails = async (req, res) => {
  try {
    var search = req.query.search || "";
    let page = parseInt(String(req.query.page || "1"), 10);
    let limit = parseInt(String(req.query.limit != null ? req.query.limit : "20"), 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    const TOKEN_LIST_MAX_LIMIT = 5000;
    if (limit > TOKEN_LIST_MAX_LIMIT) limit = TOKEN_LIST_MAX_LIMIT;

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

    const branchResult = await applyStrictBranchListFilter(req, query);
    if (branchResult === "empty") {
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

    const scopeResult = await applyPatientIdScopeToQuery(req, query);
    if (scopeResult === "empty") {
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

    const Details = await Token.find(query).sort({createdAt:-1})
      .populate(['doctorId', 'patientId'])
      .limit(limit)
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

    const branchResult = await applyStrictBranchListFilter(req, filter);
    if (branchResult === "empty") {
      return res.status(200).json({
        status: 'ok',
        page,
        limit,
        totalAppointments: 0,
        totalPages: 0,
        topDoctor: null,
        data: [],
      });
    }

    const scopeResult = await applyPatientIdScopeToQuery(req, filter);
    if (scopeResult === "empty") {
      return res.status(200).json({
        status: 'ok',
        page,
        limit,
        totalAppointments: 0,
        totalPages: 0,
        topDoctor: null,
        data: [],
      });
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

    const branchResult = await applyStrictBranchListFilter(req, appointmentFilter);
    if (branchResult === "empty") {
      return res.status(200).json({
        status: 'ok',
        page,
        limit,
        totalDoctors: 0,
        totalPages: 0,
        data: [],
      });
    }

    const scopeResult = await applyPatientIdScopeToQuery(req, appointmentFilter);
    if (scopeResult === "empty") {
      return res.status(200).json({
        status: 'ok',
        page,
        limit,
        totalDoctors: 0,
        totalPages: 0,
        data: [],
      });
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

    const bookedQuery = { tokenDate, doctorId };
    const branchResult = await applyStrictBranchListFilter(req, bookedQuery);
    if (branchResult === "empty") {
      return res.status(403).json({
        status: "fail",
        message: "Branch could not be resolved for this user",
      });
    }

    // Find already booked tokens for the given date and doctor (same branch when scoped)
    const bookedTokens = await Token.find(
      bookedQuery,
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
    if (!Detail) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
    if (!(await branchDocumentVisible(req, Detail.branchId))) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
    if (Detail.patientId && !(await patientVisibleForRequest(req, Detail.patientId))) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
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
    if (!getImage) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
    if (!(await branchDocumentVisible(req, getImage.branchId))) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
    if (getImage.patientId && !(await patientVisibleForRequest(req, getImage.patientId))) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
    if (req.body.patientId && !(await patientVisibleForRequest(req, req.body.patientId))) {
      return res.status(403).json({ status: "fail", message: "Patient not allowed for this branch" });
    }

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
    const row = await Token.findById(id);
    if (!row) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
    if (!(await branchDocumentVisible(req, row.branchId))) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
    if (row.patientId && !(await patientVisibleForRequest(req, row.patientId))) {
      return res.status(404).json({ status: "fail", message: "Detail not found" });
    }
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
