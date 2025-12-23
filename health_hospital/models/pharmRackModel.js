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
},{timestamps:true});


const PharmRack = mongoose.model('PharmRack', pharmRackSchema);

module.exports = PharmRack;
