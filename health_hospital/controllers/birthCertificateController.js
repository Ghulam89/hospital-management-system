const BirthCertificate = require("../models/birthCertificateModel");

// 1. Create birthCertificate
const addbirthCertificate = async (req, res) => {
  try {


      const birthCertificate = await BirthCertificate.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: birthCertificate });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all birthCertificates
const getbirthCertificates = async (req, res) => {
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

    const birthCertificates = await BirthCertificate.find({
      // $or: [
      //   { motherId: { $regex: ".*" + search + ".*", $options: "i" } },
      //   { doctorId: { $regex: ".*" + search + ".*", $options: "i" } },
      // ],
    }).sort({createdAt:-1})
    .populate(['motherId','doctorId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await BirthCertificate.find({
      // $or: [
      //   { motherId: { $regex: ".*" + search + ".*", $options: "i" } },
      //   { doctorId: { $regex: ".*" + search + ".*", $options: "i" } },
      // ],
    })
    .populate(['motherId','doctorId'])
      .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: birthCertificates,
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

// 3. Get birthCertificate by id
const getbirthCertificateById = async (req, res) => {
  try {
    const id = req.params.id;
    const birthCertificate = await BirthCertificate.findById(id);
    return res.status(200).json({ status: "ok", data: birthCertificate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update birthCertificate
const updatebirthCertificate = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await BirthCertificate.findById(id);

    const updatedbirthCertificate = await BirthCertificate.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updatedbirthCertificate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete birthCertificate
const deletebirthCertificate = async (req, res) => {
  try {
    const id = req.params.id;
    await BirthCertificate.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "BirthCertificate deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addbirthCertificate,
  getbirthCertificates,
  getbirthCertificateById,
  updatebirthCertificate,
  deletebirthCertificate,

};
