const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { optionalAuth, auth } = require('../middleware/auth');

router.post('/create', optionalAuth, appointmentController.addAppointment);
router.get('/get', auth, appointmentController.getAppointments);
router.get('/opdReport', optionalAuth, appointmentController.getAppointmentsOpdReport);
router.get('/opdOverallReport', optionalAuth, appointmentController.getDoctorsWithAppointmentCount);
router.get('/countStatus', optionalAuth, appointmentController.getAppointmentStatusLength);
router.get('/dashboard', optionalAuth, appointmentController.getAppointmentDashboard);
router.get('/get/:id', optionalAuth, appointmentController.getAppointmentById);
router.put('/update/:id', optionalAuth, appointmentController.updateAppointment);
router.delete('/delete/:id', optionalAuth, appointmentController.deleteAppointment);

module.exports = router;
