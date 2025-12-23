const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    startDate: {
        type: String,
        allowNull: true,
    },
    endDate: {
        type: String,
        allowNull: true,
    },
    reason: {
        type: String,
        allowNull: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
},{timestamps:true});


const Leave = mongoose.model('LeaveDetail', leaveSchema);

module.exports = Leave;
