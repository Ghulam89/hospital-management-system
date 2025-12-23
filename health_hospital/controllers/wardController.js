const Ward = require("../models/wardModel");

// 1. Create ward
const addward = async (req, res) => {
  try {


    const checkName = await Ward.findOne({ name: req.body.name });

    if (req.body.name && checkName) {
      return res
        .status(500)
        .json({ status: "fail", message: "Name already exist!" });
    }
    else {


      const ward = await Ward.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: ward });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all wards
const getwards = async (req, res) => {
  try {




    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    var page = "1";
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = "20";

    const wards = await Ward.find({
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { phone: { $regex: ".*" + search + ".*", $options: "i" } },
        { cnic: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    }).sort({createdAt:-1})
    .populate(['departmentId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Ward.find({
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { phone: { $regex: ".*" + search + ".*", $options: "i" } },
        { cnic: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    })
    .populate(['departmentId'])
      .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: wards,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Get ward by id
const getwardById = async (req, res) => {
  try {
    const id = req.params.id;
    const ward = await Ward.findById(id);
    return res.status(200).json({ status: "ok", data: ward });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update ward
const updateward = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await Ward.findById(id);

    const updatedward = await Ward.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updatedward });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete ward
const deleteward = async (req, res) => {
  try {
    const id = req.params.id;
    await Ward.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "ward deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addward,
  getwards,
  getwardById,
  updateward,
  deleteward,

};
