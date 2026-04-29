const BedDetail = require("../models/bedDetailModel");
const { getScopedWardIds, idInList } = require("../utils/branchScope");

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

      const allowedWardIds = await getScopedWardIds(req);
      if (allowedWardIds !== null && allowedWardIds.length === 0) {
        return res.status(403).json({ status: "fail", message: "No wards for this branch" });
      }
      if (allowedWardIds !== null && req.body.wardId && !idInList(req.body.wardId, allowedWardIds)) {
        return res.status(403).json({ status: "fail", message: "Ward not allowed for this branch" });
      }

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

    const allowedWardIds = await getScopedWardIds(req);
    if (allowedWardIds !== null) {
      if (allowedWardIds.length === 0) {
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
      if (query.wardId) {
        if (!idInList(query.wardId, allowedWardIds)) {
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
        query.wardId = { $in: allowedWardIds };
      }
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
    const bedDetail = await BedDetail.findById(id).lean();
    if (!bedDetail) {
      return res.status(404).json({ status: "fail", message: "Bed detail not found" });
    }
    const allowedWardIds = await getScopedWardIds(req);
    if (allowedWardIds !== null && !idInList(bedDetail.wardId, allowedWardIds)) {
      return res.status(404).json({ status: "fail", message: "Bed detail not found" });
    }
    return res.status(200).json({ status: "ok", data: bedDetail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update bedDetail
const updatebedDetail = async (req, res) => {
  try {
    let id = req.params.id;
    const existing = await BedDetail.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ status: "fail", message: "Bed detail not found" });
    }
    const allowedWardIds = await getScopedWardIds(req);
    if (allowedWardIds !== null && !idInList(existing.wardId, allowedWardIds)) {
      return res.status(404).json({ status: "fail", message: "Bed detail not found" });
    }
    if (allowedWardIds !== null && req.body.wardId && !idInList(req.body.wardId, allowedWardIds)) {
      return res.status(403).json({ status: "fail", message: "Ward not allowed for this branch" });
    }
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
    const existing = await BedDetail.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ status: "fail", message: "Bed detail not found" });
    }
    const allowedWardIds = await getScopedWardIds(req);
    if (allowedWardIds !== null && !idInList(existing.wardId, allowedWardIds)) {
      return res.status(404).json({ status: "fail", message: "Bed detail not found" });
    }
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
