const mongoose = require('mongoose');

const birthCertificateSchema = new mongoose.Schema({
    babyName: {
        type: String,
        allowNull: true,
    },
    motherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Patient',
    },
    motherMr: {
        type: String,
        allowNull: true,
    },
    motherNic: {
        type: String,
        allowNull: true,
    },
    fatherName: {
        type: String,
        allowNull: true,
    },
    fatherCnic: {
        type: String,
        allowNull: true,
    },
    deliveryNo: {
        type: String,
        allowNull: true,
    },
    modeOfdelivery: {
        type: String,
        allowNull: true,
    },
    birthMark: {
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
    weight: {
        type: String,
        allowNull: true,
    },
    height: {
        type: String,
        allowNull: true,
    },
    headCircumference: {
        type: String,
        allowNull: true,
    },
    remarks: {
        type: String,
        allowNull: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
},{timestamps:true});


const BirthCertificate = mongoose.model('BirthCertificate', birthCertificateSchema);

module.exports = BirthCertificate;
