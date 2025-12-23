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
},{timestamps:true});


const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
