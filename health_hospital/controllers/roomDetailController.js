const RoomDetail = require("../models/roomDetailModel");
const { getScopedRoomIds, idInList } = require("../utils/branchScope");

// 1. Create roomDetail
const addroomDetail = async (req, res) => {
  try {

    const allowedRoomIds = await getScopedRoomIds(req);
    if (allowedRoomIds !== null && allowedRoomIds.length === 0) {
      return res.status(403).json({ status: "fail", message: "No rooms for this branch" });
    }
    if (allowedRoomIds !== null && req.body.roomId && !idInList(req.body.roomId, allowedRoomIds)) {
      return res.status(403).json({ status: "fail", message: "Room not allowed for this branch" });
    }

    const dupQuery = { roomNo: req.body.roomNo };
    if (req.body.roomId) dupQuery.roomId = req.body.roomId;
    const checkroomNo = await RoomDetail.findOne(dupQuery);

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

    const allowedRoomIds = await getScopedRoomIds(req);
    if (allowedRoomIds !== null) {
      if (allowedRoomIds.length === 0) {
        return res.status(200).json({
          status: "ok",
          data: [],
          search,
          page,
          count: 0,
          totalPages: 0,
          currentPage: page,
          limit
        });
      }
      if (query.roomId) {
        if (!idInList(query.roomId, allowedRoomIds)) {
          return res.status(200).json({
            status: "ok",
            data: [],
            search,
            page,
            count: 0,
            totalPages: 0,
            currentPage: page,
            limit
          });
        }
      } else {
        query.roomId = { $in: allowedRoomIds };
      }
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
    const roomDetail = await RoomDetail.findById(id).lean();
    if (!roomDetail) {
      return res.status(404).json({ status: "fail", message: "Room detail not found" });
    }
    const allowedRoomIds = await getScopedRoomIds(req);
    if (allowedRoomIds !== null && !idInList(roomDetail.roomId, allowedRoomIds)) {
      return res.status(404).json({ status: "fail", message: "Room detail not found" });
    }
    return res.status(200).json({ status: "ok", data: roomDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update roomDetail
const updateroomDetail = async (req, res) => {
  try {
    let id = req.params.id;
    const existing = await RoomDetail.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ status: "fail", message: "Room detail not found" });
    }
    const allowedRoomIds = await getScopedRoomIds(req);
    if (allowedRoomIds !== null && !idInList(existing.roomId, allowedRoomIds)) {
      return res.status(404).json({ status: "fail", message: "Room detail not found" });
    }
    if (allowedRoomIds !== null && req.body.roomId && !idInList(req.body.roomId, allowedRoomIds)) {
      return res.status(403).json({ status: "fail", message: "Room not allowed for this branch" });
    }
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
    const existing = await RoomDetail.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ status: "fail", message: "Room detail not found" });
    }
    const allowedRoomIds = await getScopedRoomIds(req);
    if (allowedRoomIds !== null && !idInList(existing.roomId, allowedRoomIds)) {
      return res.status(404).json({ status: "fail", message: "Room detail not found" });
    }
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
