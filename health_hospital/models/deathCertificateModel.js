const mongoose = require('mongoose');

const deathCertificateSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Patient',
    },
    patientNic: {
        type: String,
        allowNull: true,
    },
    fatherName: {
        type: String,
        allowNull: true,
    },
    dateofAdmission: {
        type: String,
        allowNull: true,
    },
    guardName: {
        type: String,
        allowNull: true,
    },
    guardNic: {
        type: String,
        allowNull: true,
    },
    ageYear: {
        type: String,
        allowNull: true,
    },
    ageMonth: {
        type: String,
        allowNull: true,
    },
    ageDays: {
        type: String,
        allowNull: true,
    },
    phone: {
        type: String,
        allowNull: true,
    },
    address: {
        type: String,
        allowNull: true,
    },
    dob: {
        type: String,
        allowNull: true,
    },
    gender: {
        type: String,
        allowNull: true,
    },
    dod: {
        type: String,
        allowNull: true,
    },
    causeOfDeath: {
        type: String,
        allowNull: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
},{timestamps:true});


const DeathCertificate = mongoose.model('DeathCertificate', deathCertificateSchema);

module.exports = DeathCertificate;
