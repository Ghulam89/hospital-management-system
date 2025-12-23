const Appointment = require('../models/appointmentModel');
const Leave = require('../models/leaveModel');
const User = require('../models/userModel');
const Patient = require('../models/patientModel');

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
        const existing = await Appointment.findOne({
            doctorId,
            appointmentDate: formattedDate,
            startTime,
            endTime
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
                    endTime
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
                        status: status || 'Pending'
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
            status: status || 'Pending'
        });

        res.status(200).json({ status: 'ok', data: appointment });

    } catch (err) {
        console.error('Error in addAppointment:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};



const getAppointmentDashboard = async (req, res) => {
    try {
        // Get today's date range
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);



        var search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        var page = "1";
        if (req.query.page) {
            page = req.query.page;
        }

        const limit = "20";

        const dctQuery={}

        if(req.query.doctorId){
            dctQuery.doctorId=req.query.doctorId
        }

        const patQuery={}

        if(req.query.patientId){
            patQuery.patientId=req.query.patientId
        }

        const allDoctorAppointments = await Appointment.find(dctQuery).populate(['doctorId', 'patientId']);
        const allPatientAppointments = await Appointment.find(patQuery).populate(['doctorId', 'patientId']);
        // Fetch today's appointments with full data
        const allAppointments = await Appointment.find({}).populate(['doctorId', 'patientId']);
        const allDoctor = await User.find({ role: 'doctor' });
        const allPatient = await Patient.find({});

        // Fetch today's appointments with full data
        const todayAppointments = await Appointment.find({
            appointmentDate: { $gte: startOfDay, $lte: endOfDay }
        }).populate(['doctorId', 'patientId']).limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();


        const count = await Appointment.find({
            appointmentDate: { $gte: startOfDay, $lte: endOfDay }
        }).populate(['doctorId', 'patientId']).countDocuments();


        // Unique today patients
        const todayPatientIds = [...new Set(todayAppointments.map(app => app.patientId?._id?.toString()))];

        // Unique today doctors
        const todayDoctorIds = [...new Set(todayAppointments.map(app => app.doctorId?._id?.toString()))];

        // Count of check-in visits today
        const todayCheckinCount = todayAppointments.filter(app => app.appointmentStatus === 'Checkin').length;

        res.status(200).json({
            status: 'ok',
            data: {
                totalAppointments: allAppointments.length,
                totalDoctorAppointments: req.query?.doctorId?allDoctorAppointments.length:0,
                totalPatientAppointments: req.query?.patientId?allPatientAppointments.length:0,
                totalDoctor: allDoctor.length,
                totalPatient: allPatient.length,
                todayAppointments,
                totalTodayPatients: todayPatientIds.length,
                totalTodayDoctors: todayDoctorIds.length,
                totalTodayCheckinVisits: todayCheckinCount,
                search,
                page,
                count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit
            }
        });
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
            page = 1, // Default to page 1
            limit = 12 // Default to 12 items per page
        } = req.query;
        
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
        
        // Date Range Filter - Improved handling
        if (fromDate || toDate) {
            query.appointmentDate = {};
            
            if (fromDate) {
                // Ensure we're capturing the entire start day
                const startDate = new Date(fromDate);
                startDate.setHours(0, 0, 0, 0);
                query.appointmentDate.$gte = startDate;
            }
            
            if (toDate) {
                // Ensure we're capturing the entire end day
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                query.appointmentDate.$lte = endDate;
            }
        }
        
        // Calculate skip value for pagination
        const skip = (page - 1) * limit;
        
        // Get total count for pagination info
        const total = await Appointment.countDocuments(query);
        
        const data = await Appointment.find(query)
            .populate(['doctorId', 'patientId'])
            .sort({ appointmentDate: -1, startTime: 1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        res.status(200).json({ 
            status: 'ok', 
            data,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
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
        res.status(200).json({ status: 'ok', data });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// 4. Update Appointment
const updateAppointment = async (req, res) => {
    try {
        const id = req.params.id;
        

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
