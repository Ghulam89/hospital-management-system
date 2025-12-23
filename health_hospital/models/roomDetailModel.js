const mongoose = require('mongoose');

const roomDetailSchema = new mongoose.Schema({
    roomNo: {
        type: String,
        allowNull: true,
    },
    charges: {
        type: String,
        allowNull: true,
    },
    status: {
        type: String,
        allowNull: true,
        default:'available'
    },
    chargeType: {
        type: String,
        allowNull: true,
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Room',
    },
},{timestamps:true});


const RoomDetail = mongoose.model('RoomDetail', roomDetailSchema);

module.exports = RoomDetail;
