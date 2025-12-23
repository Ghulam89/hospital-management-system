const mongoose = require('mongoose');

const procedureSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    amount: {
        type: String,
        allowNull: true,
    },
    cost: {
        type: Number,
        allowNull: true,
        default:0
    },
    description: {
        type: String,
        allowNull: true,
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
    },
}, { timestamps: true });


const procedure = mongoose.model('Procedure', procedureSchema);

module.exports = procedure;
