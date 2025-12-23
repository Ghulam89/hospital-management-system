const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    gender: {
        type: String,
        allowNull: false,
    },
    image: {
        type: String,
        allowNull: false,
    },
    phone: {
        type: String,
        allowNull: false,
    },
    email: {
        type: String,
        allowNull: false,
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Department',
    },
    password: {
        type: String,
        allowNull: true,
    },
    shift: {
        type: String,
        allowNull: true,
    },
    role: {
        type: String,
        allowNull: true,
    },
    tabs: {
        type: Array,
        allowNull: true,
    },
    OPD: {
        type: Boolean,
        allowNull: true,
    },
    IPD: {
        type: Boolean,
        allowNull: true,
    },
    IPDTabs: {
        type: Array,
        allowNull: true,
    },
    type: {
        type: String,
        allowNull: true,
    },
    consultationFee: {
        type: String,
        allowNull: true,
    },
    followUpCharges: {
        type: String,
        allowNull: true,
    },
    sharePrice: {
        type: String,
        allowNull: true,
    },
    shareType: {
        type: String,
        allowNull: true,
    },
    instantBooking: {
        type: Boolean,
        allowNull: true,
    },
    visitCharges: {
        type: Boolean,
        allowNull: true,
    },
    visitChargeAmount: {
        type: String,
        allowNull: true,
    },
    awards: {
        type: String,
        allowNull: true,
    },
    experties: {
        type: String,
        allowNull: true,
    },
    registrations: {
        type: String,
        allowNull: true,
    },
    memberShip: {
        type: String,
        allowNull: true,
    },
    language: {
        type: String,
        allowNull: true,
    },
    experience: {
        type: String,
        allowNull: true,
    },
    degreeCompletionDate: {
        type: String,
        allowNull: true,
    },
    PMDC: {
        type: String,
        allowNull: true,
    },
    qualification: {
        type: Array,
        allowNull: true,
    },
    services: {
        type: Array,
        allowNull: true,
    },
    monday: {
        type: Boolean,
        allowNull: true,
    },
    mondayStartTime: {
        type: String,
        allowNull: true,
    },
    mondayEndTime: {
        type: String,
        allowNull: true,
    },
    mondayDuration: {
        type: String,
        allowNull: true,
    },
    tuesday: {
        type: Boolean,
        allowNull: true,
    },
    tuesdayStartTime: {
        type: String,
        allowNull: true,
    },
    tuesdayEndTime: {
        type: String,
        allowNull: true,
    },
    tuesdayDuration: {
        type: String,
        allowNull: true,
    },
    wednesday: {
        type: Boolean,
        allowNull: true,
    },
    wednesdayStartTime: {
        type: String,
        allowNull: true,
    },
    wednesdayEndTime: {
        type: String,
        allowNull: true,
    },
    wednesdayDuration: {
        type: String,
        allowNull: true,
    },
    thursday: {
        type: Boolean,
        allowNull: true,
    },
    thursdayStartTime: {
        type: String,
        allowNull: true,
    },
    thursdayEndTime: {
        type: String,
        allowNull: true,
    },
    thursdayDuration: {
        type: String,
        allowNull: true,
    },
    friday: {
        type: Boolean,
        allowNull: true,
    },
    fridayStartTime: {
        type: String,
        allowNull: true,
    },
    fridayEndTime: {
        type: String,
        allowNull: true,
    },
    fridayDuration: {
        type: String,
        allowNull: true,
    },
    saturday: {
        type: Boolean,
        allowNull: true,
    },
    saturdayStartTime: {
        type: String,
        allowNull: true,
    },
    saturdayEndTime: {
        type: String,
        allowNull: true,
    },
    saturdayDuration: {
        type: String,
        allowNull: true,
    },
    sunday: {
        type: Boolean,
        allowNull: true,
    },
    sundayStartTime: {
        type: String,
        allowNull: true,
    },
    sundayEndTime: {
        type: String,
        allowNull: true,
    },
    leaveStartDate: {
        type: String,
        allowNull: true,
    },
    leaveEndDate: {
        type: String,
        allowNull: true,
    },
    sundayDuration: {
        type: String,
        allowNull: true,
    },
    lastSignedIn: {
        type: Date,
        allowNull: true,
    },
    block: {
        type: Boolean,
        allowNull: true,
    },
},{timestamps:true});


const User = mongoose.model('User', userSchema);

module.exports = User;
