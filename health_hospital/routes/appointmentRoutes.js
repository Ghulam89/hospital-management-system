const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.post('/create', appointmentController.addAppointment);
router.get('/get', appointmentController.getAppointments);
router.get('/opdReport', appointmentController.getAppointmentsOpdReport);
router.get('/opdOverallReport', appointmentController.getDoctorsWithAppointmentCount);
router.get('/countStatus', appointmentController.getAppointmentStatusLength);
router.get('/dashboard', appointmentController.getAppointmentDashboard);
router.get('/get/:id', appointmentController.getAppointmentById);
router.put('/update/:id', appointmentController.updateAppointment);
router.delete('/delete/:id', appointmentController.deleteAppointment);

module.exports = router;
