const mongoose = require('mongoose');

const bedDetailSchema = new mongoose.Schema({
    bedNo: {
        type: String,
        allowNull: true,
    },
    charges: {
        type: String,
        allowNull: true,
    },
    chargeType: {
        type: String,
        allowNull: true,
    },
    status: {
        type: String,
        allowNull: true,
        default:'available'
    },
    wardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Ward',
    },
},{timestamps:true});


const BedDetail = mongoose.model('BedDetail', bedDetailSchema);

module.exports = BedDetail;
