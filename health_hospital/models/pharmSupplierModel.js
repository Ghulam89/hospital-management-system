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
    paymentTerms: {
        type: String,
        allowNull: true,
    },
    creditDays: {
        type: Number,
        allowNull: true,
        default: 0
    },
    defaultPaymentMethod: {
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
    payments: [
        {
            method: { type: String, allowNull: true },
            payDate: { type: Date, allowNull: true },
            paid: { type: Number, allowNull: true },
            reference: { type: String, allowNull: true },
            chequeNo: { type: String, allowNull: true },
            bankName: { type: String, allowNull: true },
            chequeDate: { type: Date, allowNull: true },
            notes: { type: String, allowNull: true }
        }
    ],
    adjustments: [
        {
            adjDate: { type: Date, allowNull: true },
            direction: { type: String, allowNull: true }, // 'Debit' | 'Credit'
            amount: { type: Number, allowNull: true },
            reference: { type: String, allowNull: true },
            notes: { type: String, allowNull: true }
        }
    ],
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
    },
}, { timestamps: true });


const PharmSupplier = mongoose.model('PharmSupplier', pharmSupplierSchema);

module.exports = PharmSupplier;
