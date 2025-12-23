const { Types } = require("mongoose");
const Invoice = require("../models/invoiceModel");
const moment = require("moment");

// 1. Create invoice
const addinvoice = async (req, res) => {
  try {



    const data = await Invoice.create({ ...req.body, });
    return res.status(200).json({ status: "ok", data: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all invoices
const getinvoices = async (req, res) => {
  try {
    const {
      doctorId,
      departmentId,
      patientMR,
      patientName,
      patientPhone,
      invoiceNo,
      invoiceNumber,
      paymentMode,
      procedureId,
      startDate,
      endDate,
      status,
      search = '',
      page = 1,
      minTotalBill,
      maxTotalBill,
    } = req.query;

    const limit = 20;
    const query = {};

    // Basic filters
    if (doctorId && doctorId.trim() !== '') {
      query['doctorId'] = doctorId;
      console.log('Doctor filter applied:', doctorId);
    }
    if (departmentId && departmentId.trim() !== '') {
      // Note: departmentId filter will be handled in aggregation pipeline
      // because department info comes through doctorId
      console.log('Department filter requested:', departmentId);
    }
    // Note: patientMR filter will be handled separately due to nested lookup
    // Handle invoiceNo or invoiceNumber (both map to invoiceNo)
    const invoiceNoValue = invoiceNo || invoiceNumber;
    if (invoiceNoValue && invoiceNoValue.trim() !== '') query['invoiceNo'] = new RegExp(invoiceNoValue, 'i');
    
    // Status filter
    if (status && status.trim() !== '') {
      if (status === 'Paid') {
        query['duePay'] = 0;
      } else if (status === 'Pending') {
        query['duePay'] = { $gt: 0 };
      } else if (status === 'Credit') {
        query['duePay'] = { $lt: 0 };
      }
    }

    // Procedure filter - corrected approach
    if (procedureId && procedureId.trim() !== '') {
      query['item'] = {
        $elemMatch: {
          procedureId: procedureId
        }
      };
    }

    // Payment mode filter - corrected for array
    if (paymentMode && paymentMode.trim() !== '') {
      query['payment.method'] = paymentMode;
      // OR if you need to match any element in the array:
      // query['payment'] = {
      //   $elemMatch: {
      //     method: paymentMode
      //   }
      // };
    }

    // Total bill range
    if (minTotalBill || maxTotalBill) {
      query['totalBill'] = {};
      if (minTotalBill && minTotalBill.trim() !== '') {
        query['totalBill'].$gte = parseFloat(minTotalBill);
        console.log('Min amount filter applied:', parseFloat(minTotalBill));
      }
      if (maxTotalBill && maxTotalBill.trim() !== '') {
        query['totalBill'].$lte = parseFloat(maxTotalBill);
        console.log('Max amount filter applied:', parseFloat(maxTotalBill));
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query['createdAt'] = {};
      if (startDate && startDate.trim() !== '') {
        // Parse incoming ISO string date and use it directly
        const parsedStartDate = new Date(startDate);
        query['createdAt'].$gte = parsedStartDate;
        console.log('Start date filter applied:', parsedStartDate, 'ISO:', parsedStartDate.toISOString());
      }
      if (endDate && endDate.trim() !== '') {
        // Parse incoming ISO string date and use it directly
        const parsedEndDate = new Date(endDate);
        query['createdAt'].$lte = parsedEndDate;
        console.log('End date filter applied:', parsedEndDate, 'ISO:', parsedEndDate.toISOString());
      }
    }

    // Text search
    // Remove $or from query if aggregation is being used
    let useAggregation = false;
    // Use aggregation if patient search filters, department, invoice number, or general search are present
    // OR if date filters are present (to ensure patient filters work correctly with dates)
    if (
      (patientMR && patientMR.trim() !== '') ||
      (patientName && patientName.trim() !== '') ||
      (patientPhone && patientPhone.trim() !== '') ||
      (invoiceNoValue && invoiceNoValue.trim() !== '') ||
      (departmentId && departmentId.trim() !== '') ||
      (search && search.trim() !== '') ||
      (startDate && startDate.trim() !== '') ||
      (endDate && endDate.trim() !== '')
    ) {
      useAggregation = true;
    }
    if (search && search.trim() !== '' && !useAggregation) {
      query['$or'] = [
        { 'patientId.name': { $regex: search, $options: 'i' } },
        { 'patientId.mr': { $regex: search, $options: 'i' } },
        { 'doctorId.name': { $regex: search, $options: 'i' } },
        { 'item.description': { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } }
      ];
    }

    let invoices, count;

    // If patientMR filter or departmentId filter is applied, OR search param is present, use aggregation
    if (useAggregation) {
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientData'
          }
        },
        { $unwind: { path: '$patientData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorData'
          }
        },
        { $unwind: { path: '$doctorData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'departments',
            localField: 'doctorData.departmentId',
            foreignField: '_id',
            as: 'departmentData'
          }
        },
        { $unwind: { path: '$departmentData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'procedures',
            localField: 'item.procedureId',
            foreignField: '_id',
            as: 'procedureData'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdById',
            foreignField: '_id',
            as: 'createdByData'
          }
        },
        { $unwind: { path: '$createdByData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'updatedById',
            foreignField: '_id',
            as: 'updatedByData'
          }
        },
        { $unwind: { path: '$updatedByData', preserveNullAndEmptyArrays: true } }
      ];

      // Add conditional filters
      if (patientMR && patientMR.trim() !== '') {
        pipeline.push({
          $match: {
            'patientData.mr': { $regex: patientMR, $options: 'i' }
          }
        });
      }
      if (patientName && patientName.trim() !== '') {
        pipeline.push({
          $match: {
            'patientData.name': { $regex: patientName, $options: 'i' }
          }
        });
      }
      if (patientPhone && patientPhone.trim() !== '') {
        pipeline.push({
          $match: {
            'patientData.phone': { $regex: patientPhone, $options: 'i' }
          }
        });
      }
      if (invoiceNoValue && invoiceNoValue.trim() !== '') {
        pipeline.push({
          $match: {
            'invoiceNo': { $regex: invoiceNoValue, $options: 'i' }
          }
        });
      }
      if (departmentId && departmentId.trim() !== '') {
        pipeline.push({
          $match: {
            'departmentData._id': new Types.ObjectId(departmentId)
          }
        });
      }
      // Add search $match after patientData/doctorData unwind
      if (search && search.trim() !== '') {
        pipeline.push({
          $match: {
            $or: [
              { 'patientData.name': { $regex: search, $options: 'i' } },
              { 'patientData.mr': { $regex: search, $options: 'i' } },
              { 'patientData.phone': { $regex: search, $options: 'i' } },
              { 'patientData.cnic': { $regex: search, $options: 'i' } },
              { 'doctorData.name': { $regex: search, $options: 'i' } },
              { 'item.description': { $regex: search, $options: 'i' } },
              { invoiceNo: { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      // Add sorting and pagination
      pipeline.push({ $sort: { createdAt: -1 } });
      pipeline.push({ $skip: (parseInt(page) - 1) * limit });
      pipeline.push({ $limit: limit });

      // Count pipeline
      const countPipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientData'
          }
        },
        { $unwind: { path: '$patientData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorData'
          }
        },
        { $unwind: { path: '$doctorData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'departments',
            localField: 'doctorData.departmentId',
            foreignField: '_id',
            as: 'departmentData'
          }
        },
        { $unwind: { path: '$departmentData', preserveNullAndEmptyArrays: true } }
      ];

      // Add conditional filters to count pipeline
      if (patientMR && patientMR.trim() !== '') {
        countPipeline.push({
          $match: {
            'patientData.mr': { $regex: patientMR, $options: 'i' }
          }
        });
      }
      if (patientName && patientName.trim() !== '') {
        countPipeline.push({
          $match: {
            'patientData.name': { $regex: patientName, $options: 'i' }
          }
        });
      }
      if (patientPhone && patientPhone.trim() !== '') {
        countPipeline.push({
          $match: {
            'patientData.phone': { $regex: patientPhone, $options: 'i' }
          }
        });
      }
      if (invoiceNoValue && invoiceNoValue.trim() !== '') {
        countPipeline.push({
          $match: {
            'invoiceNo': { $regex: invoiceNoValue, $options: 'i' }
          }
        });
      }
      if (departmentId && departmentId.trim() !== '') {
        countPipeline.push({
          $match: {
            'departmentData._id': new Types.ObjectId(departmentId)
          }
        });
      }

      invoices = await Invoice.aggregate(pipeline);
      const countResult = await Invoice.aggregate(countPipeline);
      count = countResult.length;

      // Debug: print first invoice and patientData
      if (invoices.length > 0) {
        console.log('Aggregation result sample:', invoices[0]);
        console.log('Aggregation patientData:', invoices[0].patientData);
      } else {
        console.log('Aggregation result is empty');
      }

      // Transform data to match expected structure
      invoices = invoices.map(invoice => ({
        ...invoice,
        patientId: invoice.patientData,
        doctorId: invoice.doctorData,
        item: invoice.item.map(item => ({
          ...item,
          procedureId: invoice.procedureData.find(proc => proc._id.toString() === item.procedureId?.toString())
        }))
      }));

    } else {
      // Use simple find query for other filters
      invoices = await Invoice.find(query)
        .sort({ createdAt: -1 })
        .populate({
          path: 'doctorId',
          populate: {
            path: 'departmentId'
          }
        })
        .populate('patientId')
        .populate('departmentId')
        .populate({
          path: 'item.procedureId',
          model: 'Procedure'
        })
        .limit(limit)
        .skip((parseInt(page) - 1) * limit)
        .exec();

      count = await Invoice.countDocuments(query);
    }

    // Debug log
    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('PatientMR filter:', patientMR);
    console.log('Found invoices:', invoices.length);
    
    // Debug department filter
    if (departmentId && departmentId.trim() !== '') {
      console.log('=== DEPARTMENT FILTER DEBUG ===');
      console.log('DepartmentId filter:', departmentId);
      
      // Check if any invoices have this departmentId
      const directQuery = await Invoice.find({ departmentId: departmentId }).limit(5);
      console.log('Direct departmentId query results:', directQuery.length);
      
      // Check all invoices to see departmentId values
      const allInvoices = await Invoice.find({}).limit(10);
      console.log('Sample invoices departmentId values:');
      allInvoices.forEach((inv, index) => {
        console.log(`Invoice ${index + 1}:`, {
          id: inv._id,
          departmentId: inv.departmentId,
          doctorId: inv.doctorId
        });
      });
      
      // Check if departmentId exists in any invoice
      const hasDepartmentId = await Invoice.findOne({ departmentId: { $exists: true, $ne: null } });
      console.log('Any invoice with departmentId field:', !!hasDepartmentId);
    }
    
    
    const summary = {
  totalSubTotal: 0,
  totalDiscount: 0,
  totalTax: 0,
  grandTotal: 0,
  totalDue: 0,
  totalAdvance: 0,
  totalPaid: 0,
  totalRemaining: 0,
   totalDoctorShare: 0, 
  totalHospitalShare: 0,
};


invoices.forEach(invoice => {
  summary.totalSubTotal += invoice.subTotalBill || 0;
  summary.totalDiscount += invoice.discountBill || 0;
  summary.totalTax += invoice.taxBill || 0;
  summary.grandTotal += invoice.totalBill || 0;
  summary.totalDue += invoice.duePay || 0;
  summary.totalAdvance += invoice.advancePay || 0;
  summary.totalPaid += invoice.totalPay || 0;
  summary.totalRemaining += invoice.remainPay || 0
  
   if (invoice.item && invoice.item.length > 0) {
    invoice.item.forEach(item => {
      summary.totalDoctorShare += item.doctorAmount || 0;
      summary.totalHospitalShare += item.hospitalAmount || 0;
    });
  }
  
});

 


    res.status(200).json({
      status: "ok",
      data: invoices,
      search,
      page,
       summary: summary, 
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// 3. Get invoice by id
const getinvoiceById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await Invoice.findById(id);
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update invoice
const updateinvoice = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await Invoice.findById(id);

    const data = await Invoice.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete invoice
const deleteinvoice = async (req, res) => {
  try {
    const id = req.params.id;
    await Invoice.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "invoice deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Invoice Summary/Statistics - Separate dedicated API
const getInvoiceSummary = async (req, res) => {
  try {
    const {
      doctorId,
      departmentId,
      patientMR,
      paymentMode,
      procedureId,
      startDate,
      endDate,
      status,
      search = '',
      minTotalBill,
      maxTotalBill,
    } = req.query;

    const matchQuery = {};

    // Apply same filters as getinvoices
    if (doctorId && doctorId.trim() !== '') {
      matchQuery['doctorId'] = Types.ObjectId(doctorId);
    }
    if (status && status.trim() !== '') {
      if (status === 'Paid') {
        matchQuery['duePay'] = 0;
      } else if (status === 'Pending') {
        matchQuery['duePay'] = { $gt: 0 };
      } else if (status === 'Credit') {
        matchQuery['duePay'] = { $lt: 0 };
      }
    }
    if (procedureId && procedureId.trim() !== '') {
      matchQuery['item'] = {
        $elemMatch: {
          procedureId: procedureId
        }
      };
    }
    if (paymentMode && paymentMode.trim() !== '') {
      matchQuery['payment.method'] = paymentMode;
    }
    if (minTotalBill || maxTotalBill) {
      matchQuery['totalBill'] = {};
      if (minTotalBill && minTotalBill.trim() !== '') {
        matchQuery['totalBill'].$gte = parseFloat(minTotalBill);
      }
      if (maxTotalBill && maxTotalBill.trim() !== '') {
        matchQuery['totalBill'].$lte = parseFloat(maxTotalBill);
      }
    }

    // Date range filter
    if (startDate || endDate) {
      matchQuery['createdAt'] = {};
      if (startDate) {
        matchQuery['createdAt'].$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery['createdAt'].$lte = new Date(endDate);
      }
    }

    console.log('📊 Calculating invoice summary with filters:', matchQuery);

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchQuery }
    ];

    // If department filter is needed, add lookups
    if (departmentId && departmentId.trim() !== '') {
      pipeline.push(
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorData'
          }
        },
        {
          $match: {
            'doctorData.departmentId': Types.ObjectId(departmentId)
          }
        }
      );
    }

    // If patientMR filter is needed
    if (patientMR && patientMR.trim() !== '') {
      pipeline.push(
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientData'
          }
        },
        {
          $match: {
            'patientData.mr': new RegExp(patientMR, 'i')
          }
        }
      );
    }

    // Search filter
    if (search && search.trim() !== '') {
      pipeline.push(
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientData'
          }
        },
        {
          $match: {
            $or: [
              { invoiceNo: new RegExp(search, 'i') },
              { 'patientData.name': new RegExp(search, 'i') },
              { 'patientData.mr': new RegExp(search, 'i') }
            ]
          }
        }
      );
    }

    // Calculate summary statistics
    pipeline.push({
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalRevenue: { $sum: '$totalBill' },
        totalTax: { $sum: '$taxBill' },
        totalDiscount: { $sum: '$discountBill' },
        totalPaid: { $sum: '$totalPay' },
        totalDue: { $sum: '$duePay' },
        subTotal: { $sum: '$subTotalBill' },
        // Doctor and Hospital share calculation
        allItems: { $push: '$item' }
      }
    });

    const result = await Invoice.aggregate(pipeline);

    let summary = {
      totalTransactions: 0,
      totalRevenue: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalPaid: 0,
      totalDue: 0,
      subTotal: 0,
      totalDoctorShare: 0,
      totalHospitalShare: 0
    };

    if (result.length > 0) {
      const stats = result[0];
      
      // Calculate doctor and hospital shares
      let doctorShare = 0;
      let hospitalShare = 0;
      
      if (stats.allItems && Array.isArray(stats.allItems)) {
        stats.allItems.forEach(itemArray => {
          if (Array.isArray(itemArray)) {
            itemArray.forEach(item => {
              doctorShare += item.doctorAmount || 0;
              hospitalShare += item.hospitalAmount || 0;
            });
          }
        });
      }

      summary = {
        totalTransactions: stats.totalTransactions || 0,
        totalRevenue: stats.totalRevenue || 0,
        totalTax: stats.totalTax || 0,
        totalDiscount: stats.totalDiscount || 0,
        totalPaid: stats.totalPaid || 0,
        totalDue: stats.totalDue || 0,
        subTotal: stats.subTotal || 0,
        totalDoctorShare: doctorShare,
        totalHospitalShare: hospitalShare
      };
    }

    console.log('✅ Invoice summary calculated:', summary);

    return res.status(200).json({
      status: "ok",
      summary
    });
  } catch (err) {
    console.error('Error calculating invoice summary:', err);
    res.status(500).json({ 
      status: "error",
      error: err.message 
    });
  }
};

module.exports = {
  addinvoice,
  getinvoices,
  getinvoiceById,
  updateinvoice,
  deleteinvoice,
  getInvoiceSummary,
};