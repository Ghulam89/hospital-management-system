const RoomDetail = require("../models/roomDetailModel");

// 1. Create roomDetail
const addroomDetail = async (req, res) => {
  try {


    const checkroomNo = await RoomDetail.findOne({ roomNo: req.body.roomNo });

    if (req.body.roomNo && checkroomNo) {
      return res
        .status(500)
        .json({ status: "fail", message: "Room Number already exist!" });
    }
    else {


      const roomDetail = await RoomDetail.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: roomDetail });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all roomDetails
const getroomDetails = async (req, res) => {
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
    if(req.query.roomId){
      query.roomId= req.query.roomId
    }
    if(req.query.status){
      query.status= req.query.status
    }


    const roomDetails = await RoomDetail.find(query).sort({createdAt:-1})
    .populate(['roomId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await RoomDetail.find(query)
    .populate(['roomId'])
      .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: roomDetails,
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

// 3. Get roomDetail by id
const getroomDetailById = async (req, res) => {
  try {
    const id = req.params.id;
    const roomDetail = await RoomDetail.findById(id);
    return res.status(200).json({ status: "ok", data: roomDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update roomDetail
const updateroomDetail = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await RoomDetail.findById(id);

    const updatedroomDetail = await RoomDetail.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updatedroomDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete roomDetail
const deleteroomDetail = async (req, res) => {
  try {
    const id = req.params.id;
    await RoomDetail.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "roomDetail deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addroomDetail,
  getroomDetails,
  getroomDetailById,
  updateroomDetail,
  deleteroomDetail,

};
