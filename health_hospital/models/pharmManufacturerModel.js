const mongoose = require('mongoose');

const pharmManufacturerSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
},{timestamps:true});


const PharmManufacturer = mongoose.model('PharmManufacturer', pharmManufacturerSchema);

module.exports = PharmManufacturer;
