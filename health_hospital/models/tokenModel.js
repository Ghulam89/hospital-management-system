const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    tokenNumber: {
        type: String,
        allowNull: true,
    },
    tokenDate: {
        type: Date,
        allowNull: true,
    },
    comment: {
        type: String,
        allowNull: true,
    },
    pulseHeartRate: {
        type: String,
        allowNull: true,
    },
    temprature: {
        type: String,
        allowNull: true,
    },
    bloodPressure: {
        type: String,
        allowNull: true,
    },
    respiratoryRate: {
        type: String,
        allowNull: true,
    },
    bloodSugar: {
        type: String,
        allowNull: true,
    },
    weight: {
        type: String,
        allowNull: true,
    },
    height: {
        type: String,
        allowNull: true,
    },
    bodyMassIndex: {
        type: String,
        allowNull: true,
    },
    bodySurfaceArea: {
        type: String,
        allowNull: true,
    },
    oxygenSaturation: {
        type: String,
        allowNull: true,
    },
    tokenSatus: {
        type: String,
        allowNull: true,
        default: 'Scheduled',
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Patient',
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
    procedureId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Procedure',
      }],
},{timestamps:true});


const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
