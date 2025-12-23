const BedDetail = require("../models/bedDetailModel");

// 1. Create bedDetail
const addbedDetail = async (req, res) => {
  try {


    const checkbedNo = await BedDetail.findOne({ bedNo: req.body.bedNo });

    if (req.body.bedNo && checkbedNo) {
      return res
        .status(500)
        .json({ status: "fail", message: "Bed Number already exist!" });
    }
    else {


      const bedDetail = await BedDetail.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: bedDetail });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all bedDetails
const getbedDetails = async (req, res) => {
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

    var query={}
    if(req.query.wardId){
      query.wardId= req.query.wardId
    }
    if(req.query.status){
      query.status= req.query.status
    }

    const bedDetails = await BedDetail.find(query).sort({createdAt:-1})
    .populate(['wardId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await BedDetail.find(query)
    .populate(['wardId'])
      .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: bedDetails,
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

// 3. Get bedDetail by id
const getbedDetailById = async (req, res) => {
  try {
    const id = req.params.id;
    const bedDetail = await BedDetail.findById(id);
    return res.status(200).json({ status: "ok", data: bedDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update bedDetail
const updatebedDetail = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await BedDetail.findById(id);

    const updatedbedDetail = await BedDetail.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updatedbedDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete bedDetail
const deletebedDetail = async (req, res) => {
  try {
    const id = req.params.id;
    await BedDetail.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "bedDetail deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addbedDetail,
  getbedDetails,
  getbedDetailById,
  updatebedDetail,
  deletebedDetail,

};
