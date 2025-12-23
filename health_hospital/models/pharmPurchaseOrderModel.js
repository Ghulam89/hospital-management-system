const mongoose = require('mongoose');

const pharmPurchaseOrderSchema = new mongoose.Schema({
    purchaseOrderNumber: {
        type: String,
        required: false,
        unique: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PharmSupplier',
        required: true
    },
    orderDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    expectedDeliveryDate: {
        type: Date,
        required: true
    },
    projectDays: {
        type: Number,
        default: 0
    },
    zeroQuantity: {
        type: Boolean,
        default: false
    },
    poCategory: {
        type: String,
        enum: ['Projection Period', 'Emergency', 'Regular', 'Bulk'],
        default: 'Projection Period'
    },
    unit: {
        type: String,
        enum: ['Pack', 'Piece', 'Box', 'Bottle'],
        default: 'Pack'
    },
    status: {
        type: String,
        enum: ['Draft', 'Pending', 'Approved', 'Ordered', 'Delivered', 'Cancelled'],
        default: 'Draft'
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    items: [{
        pharmItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PharmItem',
            required: true
        },
        manufacturerName: {
            type: String
        },
        b2bCategory: {
            type: String
        },
        conversionUnit: {
            type: Number,
            default: 1
        },
        currentStock: {
            type: Number,
            default: 0
        },
        soldQuantity: {
            type: Number,
            default: 0
        },
        avgSaleQuantity: {
            type: Number,
            default: 0
        },
        projectedSales: {
            type: Number,
            default: 0
        },
        unitsRequired: {
            type: Number,
            required: true
        },
        unitCost: {
            type: Number,
            required: true
        },
        totalCost: {
            type: Number,
            required: true
        }
    }],
    notes: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    }
}, { timestamps: true });

// Pre-save middleware to generate purchase order number (if not provided)
pharmPurchaseOrderSchema.pre('save', async function(next) {
    if (this.isNew && !this.purchaseOrderNumber) {
        const count = await this.constructor.countDocuments();
        this.purchaseOrderNumber = `PO${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Pre-save middleware to calculate total amount
pharmPurchaseOrderSchema.pre('save', function(next) {
    if (this.items && this.items.length > 0) {
        this.totalAmount = this.items.reduce((total, item) => total + (item.totalCost || 0), 0);
    }
    next();
});

const PharmPurchaseOrder = mongoose.model('PharmPurchaseOrder', pharmPurchaseOrderSchema);

module.exports = PharmPurchaseOrder;
