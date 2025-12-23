const mongoose = require('mongoose');

const pharmItemSchema = new mongoose.Schema({
    name: {
        type: String,
        allowNull: true,
    },
    pharmRackId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmRack',
        allowNull: true,
    },
    barcode: {
        type: String,
        allowNull: true,
    },
    pharmManufacturerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmManufacturer',
        allowNull: true,
    },
    pharmSupplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmSupplier',
        allowNull: true,
    },
    pharmCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmCategory',
        allowNull: true,
    },
    unit: {
        type: String,
        allowNull: true,
        default:'pack'
    },
    conversionUnit: {
        type: Number,
        allowNull: true,
    },
    reOrderLevel: {
        type: Number,
        allowNull: true,
    },
    retailPrice: {
        type: Number,
        allowNull: true,
    },
    openingStock: {
        type: Number,
        allowNull: true,
    },
    drugInteraction: [{
        type: String,
        allowNull: true,
    }],
    genericName: {
        type: String,
        allowNull: true,
    },
    unitCost: {
        type: Number,
        allowNull: true,
    },
    pieceCost: {
        type: Number,
        allowNull: true,
    },
    availableQuantity: {
        type: Number,
        allowNull: true,
    },
    expiredQuantity: {
        type: Number,
        allowNull: true,
        default: 0
    },
    narcotic: {
        type: Boolean,
        allowNull: true,
    },
    active: {
        type: Boolean,
        allowNull: true,
        default:true 
    },
    status: {
        type: String,
        allowNull: true,
    },
    
}, { timestamps: true });

// Pre-save hook to auto-initialize availableQuantity from openingStock
pharmItemSchema.pre('save', async function(next) {
    try {
        // Only initialize if this is a new document and openingStock is provided
        if (this.isNew && this.openingStock !== undefined && this.openingStock !== null && this.openingStock !== '') {
            // If availableQuantity is not set, initialize it with openingStock value
            if (this.availableQuantity === undefined || this.availableQuantity === null || this.availableQuantity === '') {
                this.availableQuantity = Number(this.openingStock);
            }
        }
        
        // Ensure numeric values are actually numbers
        if (this.openingStock !== undefined && this.openingStock !== null) {
            this.openingStock = Number(this.openingStock) || 0;
        }
        if (this.availableQuantity !== undefined && this.availableQuantity !== null) {
            this.availableQuantity = Number(this.availableQuantity) || 0;
        }
        if (this.expiredQuantity !== undefined && this.expiredQuantity !== null) {
            this.expiredQuantity = Number(this.expiredQuantity) || 0;
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

const PharmItem = mongoose.model('PharmItem', pharmItemSchema);

module.exports = PharmItem;
