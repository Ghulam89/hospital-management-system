const mongoose = require('mongoose');

const pharmManufacturerSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
    },
},{timestamps:true});


const PharmManufacturer = mongoose.model('PharmManufacturer', pharmManufacturerSchema);

module.exports = PharmManufacturer;
