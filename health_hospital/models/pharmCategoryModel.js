const mongoose = require('mongoose');

const pharmCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
},{timestamps:true});


const PharmCategory = mongoose.model('PharmCategory', pharmCategorySchema);

module.exports = PharmCategory;
