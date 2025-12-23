const Department = require("../models/departmentModel");
const PharmItem = require("../models/pharmItemModel");

// 1. Create pharmItem
const addpharmItem = async (req, res) => {
  try {
    // Clean the request body - remove null/undefined/empty string values
    const cleanedBody = {};
    for (const key in req.body) {
      if (req.body[key] !== null && req.body[key] !== undefined && req.body[key] !== '') {
        cleanedBody[key] = req.body[key];
      }
    }

    const data = await PharmItem.create(cleanedBody);
    return res.status(200).json({ status: "ok", data: data });

  } catch (err) {
    console.error('Error creating pharmacy item:', err);
    res.status(500).json({ error: err.message });
  }
};

// 1. Create pharmItem
const addExcelpharmItem = async (req, res) => {
  try {


    if (!req.body.departmentName) {
      return res
        .status(500)
        .json({ status: "fail", message: "Must add department name!" });
    }

    let departmentId = await Department.findOne({ name: req.body.departmentName })


    const data = await PharmItem.create({ ...req.body, departmentId:departmentId?._id });
    return res.status(200).json({ status: "ok", data: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getpharmItems = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const baseQuery = {};

    // Optional filters
    if (req.query.pharmSupplierId) {
      baseQuery.pharmSupplierId = req.query.pharmSupplierId;
    }

    if (req.query.pharmManufacturerId) {
      baseQuery.pharmManufacturerId = req.query.pharmManufacturerId;
    }

    if (req.query.pharmCategoryId) {
      baseQuery.pharmCategoryId = req.query.pharmCategoryId;
    }

    if (req.query.unit) {
      baseQuery.unit = req.query.unit;
    }

    if (req.query.active) {
      baseQuery.active = req.query.active;
    }

    if (req.query.status) {
      baseQuery.status = req.query.status;
    }

    // Filter by createdAt date range
    if (req.query.from || req.query.to) {
      baseQuery.createdAt = {};
      if (req.query.from) {
        baseQuery.createdAt.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        baseQuery.createdAt.$lte = new Date(req.query.to);
      }
    }

    // Search by name (case-insensitive)
    if (search) {
      baseQuery.name = { $regex: search, $options: "i" };
    }

    // Status filter logic
    if (req.query.stock) {
      switch (req.query.stock) {
        case 'out-of-stock':
          baseQuery.availableQuantity = 0;
          break;

        case 'low-stock':
          baseQuery.$expr = {
            $lt: ['$availableQuantity', '$reOrderLevel']
          };
          break;

        case 'expired-stock':
          baseQuery.$expr = {
            $lt: ['$availableQuantity', '$expiredQuantity']
          };
          break;

        case 'available-stock':
          baseQuery.$expr = {
            $and: [
              { $gt: ['$availableQuantity', '$reOrderLevel'] },
              { $gt: ['$availableQuantity', '$expiredQuantity'] }
            ]
          };
          break;

        default:
          baseQuery.stock = req.query.stock;
      }
    }

    const data = await PharmItem.find(baseQuery).sort({ createdAt: -1 })
      .populate(['pharmManufacturerId', 'pharmSupplierId', 'pharmCategoryId', 'pharmRackId'])
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await PharmItem.countDocuments(baseQuery);

    return res.status(200).json({
      status: "ok",
      data,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// 3. Get pharmItem by id
const getpharmItemById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PharmItem.findById(id);
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update pharmItem
const updatepharmItem = async (req, res) => {
  try {
    let id = req.params.id;
    
    // Clean the request body - remove null/undefined/empty string values
    const cleanedBody = {};
    for (const key in req.body) {
      if (req.body[key] !== null && req.body[key] !== undefined && req.body[key] !== '') {
        cleanedBody[key] = req.body[key];
      }
    }

    const data = await PharmItem.findByIdAndUpdate(
      id,
      cleanedBody,
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: data });
  } catch (err) {
    console.error('Error updating pharmacy item:', err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete pharmItem
const deletepharmItem = async (req, res) => {
  try {
    const id = req.params.id;
    await PharmItem.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Pharmacy Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addpharmItem,
  getpharmItems,
  getpharmItemById,
  updatepharmItem,
  deletepharmItem,
addExcelpharmItem
};
