const DeathCertificate = require("../models/deathCertificateModel");

// 1. Create deathCertificate
const adddeathCertificate = async (req, res) => {
  try {


      const deathCertificate = await DeathCertificate.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: deathCertificate });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all deathCertificates
const getdeathCertificates = async (req, res) => {
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

    const deathCertificates = await DeathCertificate.find({
      // $or: [
      //   { patientId: { $regex: ".*" + search + ".*", $options: "i" } },
      //   { doctorId: { $regex: ".*" + search + ".*", $options: "i" } },
      // ],
    }).sort({createdAt:-1})
    .populate(['patientId','doctorId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await DeathCertificate.find({
      // $or: [
      //   { patientId: { $regex: ".*" + search + ".*", $options: "i" } },
      //   { doctorId: { $regex: ".*" + search + ".*", $options: "i" } },
      // ],
    })
    .populate(['patientId','doctorId'])
      .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: deathCertificates,
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

// 3. Get deathCertificate by id
const getdeathCertificateById = async (req, res) => {
  try {
    const id = req.params.id;
    const deathCertificate = await DeathCertificate.findById(id);
    return res.status(200).json({ status: "ok", data: deathCertificate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update deathCertificate
const updatedeathCertificate = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await DeathCertificate.findById(id);

    const updateddeathCertificate = await DeathCertificate.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updateddeathCertificate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete deathCertificate
const deletedeathCertificate = async (req, res) => {
  try {
    const id = req.params.id;
    await DeathCertificate.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "deathCertificate deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  adddeathCertificate,
  getdeathCertificates,
  getdeathCertificateById,
  updatedeathCertificate,
  deletedeathCertificate,

};
