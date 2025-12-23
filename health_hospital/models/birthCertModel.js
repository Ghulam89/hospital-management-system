const mongoose = require('mongoose');

const birthCertSchema = new mongoose.Schema({
    babyName: {
        type: String,
        allowNull: true,
    },
    fatherName: {
        type: String,
        allowNull: true,
    },
    fathercnic: {
        type: String,
        allowNull: true,
    },
    chargeType: {
        type: String,
        allowNull: true,
    },
    motherNameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Patient',
    },
},{timestamps:true});


const BirthCert = mongoose.model('BirthCert', birthCertSchema);

module.exports = BirthCert;
