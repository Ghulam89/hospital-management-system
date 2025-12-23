const InDoorDuty = require("../models/inDoorDutyModel");

// 1. Create Detail
const addDetail = async (req, res) => {
  try {

      const Detail = await InDoorDuty.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: Detail });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all Details
const getDetails = async (req, res) => {
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

    let query={}

    if(req.query.userId){
      query.userId=req.query.userId
    }


    const Details = await InDoorDuty.find(query).sort({createdAt:-1})
    .populate(['userId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await InDoorDuty.find(query)
    .populate(['userId'])
      .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: Details,
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




// 3. Get Detail by id
const getDetailById = async (req, res) => {
  try {
    const id = req.params.id;
    const Detail = await InDoorDuty.findById(id);
    return res.status(200).json({ status: "ok", data: Detail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update Detail
const updateDetail = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await InDoorDuty.findById(id);

    const updatedDetail = await InDoorDuty.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updatedDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete Detail
const deleteDetail = async (req, res) => {
  try {
    const id = req.params.id;
    await InDoorDuty.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "Detail deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addDetail,
  getDetails,
  getDetailById,
  updateDetail,
  deleteDetail,
};
