const mongoose = require('mongoose');

const admitPatientSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Patient',
        allowNull: true,
    },
    wardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Ward',
        allowNull: true,
    },
    bedDetailId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'BedDetail',
        allowNull: true,
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Room',
        allowNull: true,
    },
    roomDetailId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'RoomDetail',
        allowNull: true,
    },
    allocationType: {
        type: String,
        allowNull: true,
    },
    admissionDate: {
        type: String,
        allowNull: true,
    },
    admissionTime: {
        type: String,
        allowNull: true,
    },
    admissionReason: {
        type: String,
        allowNull: true,
    },
    emergencyContact: {
        type: String,
        allowNull: true,
    },
    admissionNo: {
        type: String,
        allowNull: true,
    },
    diagnosis: {
        type: String,
        allowNull: true,
    },
    consultant: {
        type: String,
        allowNull: true,
    },
    anesthetist: {
        type: String,
        allowNull: true,
    },
    isDischarge: {
        type: Boolean,
        allowNull: true,
        default:false
    },
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
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        allowNull: true,
    },
    operationDate: {
        type: String,
        allowNull: true,
    },
    procedureName: {
        type: String,
        allowNull: true,
    },
    status: {
        type: Boolean,
        allowNull: true,
        default:true
    },
},{timestamps:true});


const AdmitPatient = mongoose.model('AdmitPatient', admitPatientSchema);

module.exports = AdmitPatient;
