const mongoose = require('mongoose');

const dischargePatientSchema = new mongoose.Schema({
    dischargeStatus: {
        type: String,
        allowNull: true,
    },
    dischargeDate: {
        type: String,
        allowNull: true,
    },
    dischargeTime: {
        type: String,
        allowNull: true,
    },
    document: {
        type: [String],
        allowNull: true,
    },
    admitPatientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'AdmitPatient',
    },
},{timestamps:true});


const DischargePatient = mongoose.model('DischargePatient', dischargePatientSchema);

module.exports = DischargePatient;
