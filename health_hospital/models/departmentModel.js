const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    subDepartment: {
        type: Array,
        allowNull: true,
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        index: true,
    },
},{timestamps:true});

departmentSchema.index({ branchId: 1 });

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
