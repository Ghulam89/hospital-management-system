const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    mr: {
        type: String,
        allowNull: true,
    },
    name: {
        type: String,
        allowNull: true,
    },
    gender: {
        type: String,
        allowNull: false,
    },
    phone: {
        type: String,
        allowNull: false,
    },
    phoneOwner: {
        type: String,
        allowNull: false,
    },
    cnic: {
        type: String,
        allowNull: false,
    },
    image: {
        type: String,
        allowNull: false,
    },
    registerDate: {
        type: Date,
        allowNull: false,
    },
    dob: {
        type: Date,
        allowNull: false,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
    smsPreference: {
        type: String,
        allowNull: false,
    },
    deceased: {
        type: Boolean,
        allowNull: false,
    },
    deathDate: {
        type: Date,
        allowNull: false,
    },
    deathCause: {
        type: String,
        allowNull: false,
    },
    status: {
        type: String,
        allowNull: false,
    },
    
    
},{timestamps:true});


const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
