const mongoose = require('mongoose');
const Appointment = require('../models/appointmentModel');
const Leave = require('../models/leaveModel');
const User = require('../models/userModel');
const Patient = require('../models/patientModel');
const {
    applyPatientIdScopeToQuery,
    patientVisibleForRequest,
    mergeBranchScopedQuery,
    applyStrictBranchListFilter,
    assignBranchIdForCreate,
    branchDocumentVisible, branchDocumentDeletable,
} = require("../utils/branchScope");

// Utility for recurrence


// 1. Create Appointment
const getRecurringDates = (startDate, days, unit, interval, endDate) => {
    const recurringDates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    while (start <= end) {
        const dayAbbr = start.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
        if (days.includes(dayAbbr)) {
            recurringDates.push(new Date(start));
        }
        start.setDate(start.getDate() + 1);
    }

    return recurringDates;
};

const addAppointment = async (req, res) => {
    try {
        const {
            patientId,
            doctorId,
            appointmentDate,
            startTime,
            endTime,
            consultationType,
            isRecurring,
            repeatEvery,
            repeatUnit,
            repeatDays,
            endsOn,
            status
        } = req.body;

        if (!patientId || !doctorId || !appointmentDate || !startTime || !endTime || !consultationType) {
            return res.status(400).json({ status: 'fail', message: 'Required fields are missing' });
        }
        if (!(await patientVisibleForRequest(req, patientId))) {
            return res.status(403).json({ status: 'fail', message: 'Patient not allowed for this branch' });
        }

        const formattedDate = new Date(appointmentDate);

        // Check if doctor is on leave for single appointment
        const leaveConflict = await Leave.findOne({
            doctorId,
            startDate: { $lte: formattedDate },
            endDate: { $gte: formattedDate }
        });

        if (leaveConflict) {
            return res.status(400).json({ status: 'fail', message: 'Doctor is on leave on this date' });
        }

        // Check if there's an existing appointment for same doctor, date, and start time
        const branchPayload = assignBranchIdForCreate(req, {
            ...(req.body.branchId ? { branchId: req.body.branchId } : {}),
        });

        const existing = await Appointment.findOne({
            doctorId,
            appointmentDate: formattedDate,
            startTime,
            endTime,
            ...(branchPayload.branchId ? { branchId: branchPayload.branchId } : {}),
        });

        if (existing) {
            return res.status(400).json({ status: 'fail', message: 'Appointment already exists at this time' });
        }

        // If recurring, check each recurrence date
        if (isRecurring && endsOn) {
            const dates = getRecurringDates(appointmentDate, repeatDays || [], repeatUnit, repeatEvery, endsOn);
            const appointmentsToInsert = [];

            for (const date of dates) {
                const leave = await Leave.findOne({
                    doctorId,
                    startDate: { $lte: date },
                    endDate: { $gte: date }
                });

                if (leave) continue;

                const conflict = await Appointment.findOne({
                    doctorId,
                    appointmentDate: date,
                    startTime,
                    endTime,
                    ...(branchPayload.branchId ? { branchId: branchPayload.branchId } : {}),
                });

                if (!conflict) {
                    appointmentsToInsert.push({
                        patientId,
                        doctorId,
                        appointmentDate: date,
                        startTime,
                        endTime,
                        consultationType,
                        isRecurring: true,
                        repeatEvery,
                        repeatUnit,
                        repeatDays,
                        endsOn,
                        appointmentStatus: status || 'Scheduled',
                        ...(branchPayload.branchId ? { branchId: branchPayload.branchId } : {}),
                    });
                }
            }

            if (appointmentsToInsert.length === 0) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'No valid recurring slots available due to conflict or leave'
                });
            }

            const appointments = await Appointment.insertMany(appointmentsToInsert);
            return res.status(200).json({ status: 'ok', data: appointments });
        }

        // Create single appointment
        const appointment = await Appointment.create({
            patientId,
            doctorId,
            appointmentDate: formattedDate,
            startTime,
            endTime,
            consultationType,
            isRecurring: false,
            appointmentStatus: status || 'Scheduled',
            ...(branchPayload.branchId ? { branchId: branchPayload.branchId } : {}),
        });

        res.status(200).json({ status: 'ok', data: appointment });

    } catch (err) {
        console.error('Error in addAppointment:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};



// Short in-memory cache so dashboard doesn't re-hit Mongo on every remount/refresh
const DASHBOARD_CACHE_TTL_MS = 20000;
const dashboardCache = new Map();

function dashboardCacheKey(req) {
    const uid = req.user?._id ? String(req.user._id) : 'anon';
    const branch = req.query?.branchId != null ? String(req.query.branchId) : '';
    const page = req.query?.page != null ? String(req.query.page) : '1';
    const doctorId = req.query?.doctorId != null ? String(req.query.doctorId) : '';
    const patientId = req.query?.patientId != null ? String(req.query.patientId) : '';
    return `${uid}|${branch}|${page}|${doctorId}|${patientId}`;
}

const getAppointmentDashboard = async (req, res) => {
    try {
        const cacheKey = dashboardCacheKey(req);
        const bustCache = req.query?.refresh === '1' || req.query?._ts != null;
        if (!bustCache) {
            const cached = dashboardCache.get(cacheKey);
            if (cached && Date.now() - cached.at < DASHBOARD_CACHE_TTL_MS) {
                return res.status(200).json(cached.payload);
            }
        } else {
            dashboardCache.delete(cacheKey);
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const search = req.query.search || '';
        const page = req.query.page || '1';
        const limit = '20';
        const limitNum = parseInt(limit, 10);
        const pageNum = parseInt(page, 10) || 1;

        // Branch filter is enough for appointments — avoid getScopedPatientIds (huge $in).
        const branchProbe = {};
        const branchListResult = await applyStrictBranchListFilter(req, branchProbe);
        if (branchListResult === 'empty') {
            const emptyPayload = {
                status: 'ok',
                data: {
                    totalAppointments: 0,
                    totalDoctorAppointments: 0,
                    totalPatientAppointments: 0,
                    totalDoctor: 0,
                    totalPatient: 0,
                    todayAppointments: [],
                    totalTodayPatients: 0,
                    totalTodayDoctors: 0,
                    totalTodayCheckinVisits: 0,
                    search,
                    page,
                    count: 0,
                    totalPages: 0,
                    currentPage: pageNum,
                    limit,
                },
            };
            dashboardCache.set(cacheKey, { at: Date.now(), payload: emptyPayload });
            return res.status(200).json(emptyPayload);
        }

        const apptBranchPart = branchProbe.branchId ? { branchId: branchProbe.branchId } : {};
        const baseApptQuery = { ...apptBranchPart };

        const todayMatch = {
            ...baseApptQuery,
            appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        };

        const branchFilter = await mergeBranchScopedQuery(req);
        const doctorQuery = { role: 'doctor' };
        if (branchFilter && branchFilter.branchId) {
            doctorQuery.branchId = branchFilter.branchId;
        }

        // totalPatient: avoid 4-collection distinct scan on every dashboard hit
        const patientCountPromise = (async () => {
            if (!branchFilter?.branchId) {
                return Patient.countDocuments({});
            }
            const branchId = branchFilter.branchId;
            const [fromAppts, fromLegacy] = await Promise.all([
                Appointment.distinct('patientId', { branchId }),
                Patient.distinct('_id', { branchId }),
            ]);
            const set = new Set();
            for (const id of fromAppts) if (id) set.add(String(id));
            for (const id of fromLegacy) if (id) set.add(String(id));
            return set.size;
        })();

        const todayFacetPromise = Appointment.aggregate([
            { $match: todayMatch },
            {
                $facet: {
                    meta: [
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                patients: { $addToSet: '$patientId' },
                                doctors: { $addToSet: '$doctorId' },
                                checkins: {
                                    $sum: {
                                        $cond: [{ $eq: ['$appointmentStatus', 'Checkin'] }, 1, 0],
                                    },
                                },
                            },
                        },
                    ],
                    list: [
                        { $sort: { appointmentDate: 1, startTime: 1 } },
                        { $skip: (pageNum - 1) * limitNum },
                        { $limit: limitNum },
                    ],
                },
            },
        ]);

        const [
            totalAppointments,
            totalDoctor,
            totalPatient,
            todayFacet,
            totalDoctorAppointments,
            totalPatientAppointments,
        ] = await Promise.all([
            Appointment.countDocuments(baseApptQuery),
            User.countDocuments(doctorQuery),
            patientCountPromise,
            todayFacetPromise,
            req.query?.doctorId
                ? Appointment.countDocuments({ ...baseApptQuery, doctorId: req.query.doctorId })
                : Promise.resolve(0),
            req.query?.patientId
                ? Appointment.countDocuments({ ...baseApptQuery, patientId: req.query.patientId })
                : Promise.resolve(0),
        ]);

        const facet = todayFacet?.[0] || { meta: [], list: [] };
        const meta = facet.meta?.[0] || {};
        const count = meta.count || 0;
        const todayPatientIds = (meta.patients || []).filter(Boolean);
        const todayDoctorIds = (meta.doctors || []).filter(Boolean);
        const totalTodayCheckinVisits = meta.checkins || 0;
        const listDocs = facet.list || [];

        // Populate only the page of today's appointments (name/phone fields only)
        const todayAppointments = listDocs.length
            ? await Appointment.populate(listDocs, [
                { path: 'doctorId', select: 'name' },
                { path: 'patientId', select: 'name phone' },
            ])
            : [];

        const payload = {
            status: 'ok',
            data: {
                totalAppointments,
                totalDoctorAppointments,
                totalPatientAppointments,
                totalDoctor,
                totalPatient,
                todayAppointments,
                totalTodayPatients: todayPatientIds.length,
                totalTodayDoctors: todayDoctorIds.length,
                totalTodayCheckinVisits,
                search,
                page,
                count,
                totalPages: Math.ceil(count / limitNum),
                currentPage: pageNum,
                limit,
            },
        };

        dashboardCache.set(cacheKey, { at: Date.now(), payload });
        if (dashboardCache.size > 200) {
            const oldest = dashboardCache.keys().next().value;
            dashboardCache.delete(oldest);
        }

        res.status(200).json(payload);
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};






// 2. Get All Appointments
// 2. Get All Appointments
const getAppointments = async (req, res) => {
    try {
        const { 
            doctorId, 
            patientId, 
            mr, 
            status, 
            consultationType, 
            fromDate, 
            toDate,
            startDate,
            endDate,
            page = 1, // Default to page 1
            limit = 12 // Default to 12 items per page
        } = req.query;

        let pageNum = parseInt(String(page), 10);
        let limitNum = parseInt(String(limit), 10);
        if (!Number.isFinite(pageNum) || pageNum < 1) pageNum = 1;
        if (!Number.isFinite(limitNum) || limitNum < 1) limitNum = 12;
        const APPOINTMENT_LIST_MAX_LIMIT = 5000;
        if (limitNum > APPOINTMENT_LIST_MAX_LIMIT) limitNum = APPOINTMENT_LIST_MAX_LIMIT;

        const rangeStart = fromDate || startDate;
        const rangeEnd = toDate || endDate;
        
        const query = {};
        
        // Doctor Filter - Fixed to properly search by doctor name if needed
        if (doctorId) {
            // Check if it's a valid ObjectId (direct ID search)
            if (mongoose.Types.ObjectId.isValid(doctorId)) {
                query.doctorId = doctorId;
            } else {
                // If not an ObjectId, search by doctor name
                const doctors = await User.find({
                    $or: [
                        { name: { $regex: doctorId, $options: 'i' } }
                    ]
                });
                
                if (doctors.length > 0) {
                    query.doctorId = { $in: doctors.map(d => d._id) };
                } else {
                    // If no doctors found, return empty array
                    return res.status(200).json({ 
                        status: 'ok', 
                        data: [],
                        total: 0,
                        page: 1,
                        totalPages: 1
                    });
                }
            }
        }
        
        // Patient ID Filter
        if (patientId) query.patientId = patientId;
        
        // MR Number Filter
        if (mr) {
            // First find patients with matching MR numbers
            const patients = await Patient.find({ 
                mr: { $regex: mr, $options: 'i' } 
            });
            
            if (patients.length > 0) {
                query.patientId = { $in: patients.map(p => p._id) };
            } else {
                // If no patients found with this MR, return empty array
                return res.status(200).json({ 
                    status: 'ok', 
                    data: [],
                    total: 0,
                    page: 1,
                    totalPages: 1
                });
            }
        }
        
        // Status Filter
        if (status) query.appointmentStatus = status;
        
        // Consultation Type Filter
        if (consultationType) query.consultationType = consultationType;
        
        // Date Range Filter - Improved handling (frontend sends startDate/endDate; legacy fromDate/toDate)
        if (rangeStart || rangeEnd) {
            query.appointmentDate = {};
            
            if (rangeStart) {
                const start = new Date(rangeStart);
                start.setHours(0, 0, 0, 0);
                query.appointmentDate.$gte = start;
            }
            
            if (rangeEnd) {
                const end = new Date(rangeEnd);
                end.setHours(23, 59, 59, 999);
                query.appointmentDate.$lte = end;
            }
        }

        const branchResult = await applyStrictBranchListFilter(req, query);
        if (branchResult === 'empty') {
            return res.status(200).json({ 
                status: 'ok', 
                data: [],
                total: 0,
                page: pageNum,
                totalPages: 1
            });
        }

        const scopeResult = await applyPatientIdScopeToQuery(req, query);
        if (scopeResult === 'empty') {
            return res.status(200).json({ 
                status: 'ok', 
                data: [],
                total: 0,
                page: pageNum,
                totalPages: 1
            });
        }
        
        // Calculate skip value for pagination
        const skip = (pageNum - 1) * limitNum;
        
        // Get total count for pagination info
        const total = await Appointment.countDocuments(query);
        
        const data = await Appointment.find(query)
            .populate(['doctorId', 'patientId'])
            .sort({ appointmentDate: -1, startTime: 1 })
            .skip(skip)
            .limit(limitNum);
            
        res.status(200).json({ 
            status: 'ok', 
            data,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum) || 1
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};



const getAppointmentsOpdReport = async (req, res) => {
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
    if (status) filter.appointmentStatus = status;
    if (procedureId) filter.procedureId = procedureId;

    if (startDate || endDate) {
      filter.appointmentDate = {};
      if (startDate) filter.appointmentDate.$gte = new Date(startDate);
      if (endDate) filter.appointmentDate.$lte = new Date(endDate);
    }

    const branchResult = await applyStrictBranchListFilter(req, filter);
    if (branchResult === 'empty') {
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
    if (scopeResult === 'empty') {
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
    const totalAppointments = await Appointment.countDocuments(filter);

    // Get paginated appointments with population
    const appointments = await Appointment.find(filter).sort({createdAt:-1})
      .populate('doctorId', 'name') // populate doctor name only
      .populate('patientId', 'name phone dob mr') // patient fields
      .populate('procedureId', 'name') // procedure name
      .sort({ appointmentDate: -1, startTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Calculate Dr with Most OPD in filtered appointments (can be optimized but simple here)
    // Count frequency of doctorId in filtered data (all filtered, not just page)
    const allAppointmentsForDoctorCount = await Appointment.aggregate([
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
        appointmentDate: app.appointmentDate,
        startTime: app.startTime,
        endTime: app.endTime,
        appointmentStatus: app.appointmentStatus,
        consultationType: app.consultationType,
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






const getDoctorsWithAppointmentCount = async (req, res) => {
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
    if (status) appointmentFilter.appointmentStatus = status;
    if (procedureId) appointmentFilter.procedureId = mongoose.Types.ObjectId(procedureId);
    if (startDate || endDate) {
      appointmentFilter.appointmentDate = {};
      if (startDate) appointmentFilter.appointmentDate.$gte = new Date(startDate);
      if (endDate) appointmentFilter.appointmentDate.$lte = new Date(endDate);
    }

    const branchResult = await applyStrictBranchListFilter(req, appointmentFilter);
    if (branchResult === 'empty') {
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
    if (scopeResult === 'empty') {
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
    const appointmentCounts = await Appointment.aggregate([
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
      appointmentCount: countMap[doc._id.toString()] || 0,
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



// 3. Get Appointment by ID
const getAppointmentStatusLength = async (req, res) => {
    try {

        const query = {};
        if (req.query.doctorId) query.doctorId = req.query.doctorId;
        if (req.query.patientId) query.patientId = req.query.patientId;
        if (req.query.appointmentStatus) query.appointmentStatus = req.query.appointmentStatus;

        const branchResult = await applyStrictBranchListFilter(req, query);
        if (branchResult === 'empty') {
            return res.status(200).json({ status: 'ok', data: 0 });
        }

        const scopeResult = await applyPatientIdScopeToQuery(req, query);
        if (scopeResult === 'empty') {
            return res.status(200).json({ status: 'ok', data: 0 });
        }

        const data = await Appointment.find(query).populate(['doctorId', 'patientId']);
        res.status(200).json({ status: 'ok', data: data.length });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};




// 3. Get Appointment by ID
const getAppointmentById = async (req, res) => {
    try {
        const data = await Appointment.findById(req.params.id).populate(['doctorId', 'patientId']);
        if (!data) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        if (!(await branchDocumentVisible(req, data.branchId))) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        if (data.patientId?._id && !(await patientVisibleForRequest(req, data.patientId._id))) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        res.status(200).json({ status: 'ok', data });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// 4. Update Appointment
const updateAppointment = async (req, res) => {
    try {
        const id = req.params.id;
        const existing = await Appointment.findById(id).lean();
        if (!existing) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        if (!(await branchDocumentVisible(req, existing.branchId))) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        if (existing.patientId && !(await patientVisibleForRequest(req, existing.patientId))) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        if (req.body.patientId && !(await patientVisibleForRequest(req, req.body.patientId))) {
            return res.status(403).json({ status: 'fail', message: 'Patient not allowed for this branch' });
        }

        const updated = await Appointment.findByIdAndUpdate(id, {
           ...req.body
        }, { new: true });

        res.status(200).json({ status: 'ok', data: updated });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// 5. Delete Appointment
const deleteAppointment = async (req, res) => {
    try {
        const existing = await Appointment.findById(req.params.id).lean();
        if (!existing) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        if (!(await branchDocumentDeletable(req, existing.branchId))) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        if (existing.patientId && !(await patientVisibleForRequest(req, existing.patientId))) {
            return res.status(404).json({ status: 'fail', message: 'Appointment not found' });
        }
        await Appointment.findByIdAndDelete(req.params.id);
        res.status(200).json({ status: 'ok', message: 'Appointment deleted' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

module.exports = {
    addAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    getAppointmentStatusLength,
    getAppointmentDashboard,
    getAppointmentsOpdReport,
    getDoctorsWithAppointmentCount
};
