const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Department',
    },
},{timestamps:true});


const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
