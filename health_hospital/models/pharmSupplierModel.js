const mongoose = require('mongoose');

const pharmSupplierSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    phone: {
        type: String,
        allowNull: true,
    },
    address: {
        type: String,
        allowNull: true,
    },
    primaryPersonName: {
        type: String,
        allowNull: true,
    },
    primaryPersonPhone: {
        type: String,
        allowNull: true,
    },
    openingBalance: {
        type: Number,
        allowNull: true,
    },
    slaDate: {
        type: String,
        allowNull: true,
    },
    ntn: {
        type: String,
        allowNull: true,
    },
    stn: {
        type: String,
        allowNull: true,
    },
    pharmManufacturerId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmManufacturer',
    }],
    addedById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });


const PharmSupplier = mongoose.model('PharmSupplier', pharmSupplierSchema);

module.exports = PharmSupplier;
