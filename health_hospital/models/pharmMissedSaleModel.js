const mongoose = require('mongoose');

const pharmMissedSaleSchema = new mongoose.Schema({
    pharmItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmItem',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    reason: {
        type: String,
        required: true,
        enum: ['Out of Stock', 'Customer Cancelled', 'Payment Failed', 'Item Damaged', 'Other']
    },
    missedDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    estimatedLoss: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'Investigated', 'Resolved', 'Cancelled'],
        default: 'Pending'
    },
    notes: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    }
}, { timestamps: true });

// Pre-save middleware to calculate estimated loss
pharmMissedSaleSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('quantity')) {
        try {
            const PharmItem = require('./pharmItemModel');
            const item = await PharmItem.findById(this.pharmItemId);
            if (item) {
                this.estimatedLoss = this.quantity * item.retailPrice;
            }
        } catch (error) {
            console.error('Error calculating estimated loss:', error);
        }
    }
    next();
});

const PharmMissedSale = mongoose.model('PharmMissedSale', pharmMissedSaleSchema);

module.exports = PharmMissedSale;