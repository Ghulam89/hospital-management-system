const mongoose = require('mongoose');

const pharmRackSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    pharmItemId: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PharmItem',
        }],
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
    },
},{timestamps:true});


const PharmRack = mongoose.model('PharmRack', pharmRackSchema);

module.exports = PharmRack;
