const Room = require("../models/roomModel");
const { getScopedDepartmentIds, idInList } = require("../utils/branchScope");

// 1. Create room
const addroom = async (req, res) => {
  try {


    const checkName = await Room.findOne({ name: req.body.name });

    if (req.body.name && checkName) {
      return res
        .status(500)
        .json({ status: "fail", message: "Name already exist!" });
    }
    else {

      const allowedDeptIds = await getScopedDepartmentIds(req);
      if (
        allowedDeptIds !== null &&
        req.body.departmentId &&
        !idInList(req.body.departmentId, allowedDeptIds)
      ) {
        return res.status(403).json({ status: "fail", message: "Department not allowed for this branch" });
      }
      if (allowedDeptIds !== null && allowedDeptIds.length === 0) {
        return res.status(403).json({ status: "fail", message: "No departments for this branch" });
      }

      const room = await Room.create({ ...req.body, });
      return res.status(200).json({ status: "ok", data: room });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all rooms
const getrooms = async (req, res) => {
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

    const allowedDeptIds = await getScopedDepartmentIds(req);
    const query = {
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    };
    if (allowedDeptIds !== null) {
      query.departmentId = { $in: allowedDeptIds };
    }

    const rooms = await Room.find(query).sort({createdAt:-1})
    .populate(['departmentId'])
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Room.find(query)
    .populate(['departmentId'])
    .countDocuments();






    return res.status(200).json({
      status: "ok",
      data: rooms,
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

// 3. Get room by id
const getroomById = async (req, res) => {
  try {
    const id = req.params.id;
    const room = await Room.findById(id).lean();
    if (!room) {
      return res.status(404).json({ status: "fail", message: "Room not found" });
    }
    const allowedDeptIds = await getScopedDepartmentIds(req);
    if (allowedDeptIds !== null && !idInList(room.departmentId, allowedDeptIds)) {
      return res.status(404).json({ status: "fail", message: "Room not found" });
    }
    return res.status(200).json({ status: "ok", data: room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update room
const updateroom = async (req, res) => {
  try {
    let id = req.params.id;
    const existing = await Room.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ status: "fail", message: "Room not found" });
    }
    const allowedDeptIds = await getScopedDepartmentIds(req);
    if (allowedDeptIds !== null && !idInList(existing.departmentId, allowedDeptIds)) {
      return res.status(404).json({ status: "fail", message: "Room not found" });
    }
    if (
      allowedDeptIds !== null &&
      req.body.departmentId &&
      !idInList(req.body.departmentId, allowedDeptIds)
    ) {
      return res.status(403).json({ status: "fail", message: "Department not allowed for this branch" });
    }
    let getImage = await Room.findById(id);

    const updatedroom = await Room.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updatedroom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete room
const deleteroom = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await Room.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ status: "fail", message: "Room not found" });
    }
    const allowedDeptIds = await getScopedDepartmentIds(req);
    if (allowedDeptIds !== null && !idInList(existing.departmentId, allowedDeptIds)) {
      return res.status(404).json({ status: "fail", message: "Room not found" });
    }
    await Room.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "room deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addroom,
  getrooms,
  getroomById,
  updateroom,
  deleteroom,

};
