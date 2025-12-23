const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Department',
    },
},{timestamps:true});


const Ward = mongoose.model('Ward', wardSchema);

module.exports = Ward;
