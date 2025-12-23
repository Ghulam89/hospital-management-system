const User = require("../models/userModel");
const jwt = require("jsonwebtoken");


// 1. Create user
const adduser = async (req, res) => {
  try {


    const checkPhone = await User.findOne({ phone: req.body.phone });
    const checkemail = await User.findOne({ email: req.body.email });

    if (req.body.email && checkemail) {
      return res
        .status(500)
        .json({ status: "fail", message: "Email already exist!" });
    }
    else if (req.body.phone && checkPhone) {
      return res
        .status(500)
        .json({ status: "fail", message: "Phone already exist!" });
    }
    else {

      
      
      const user = await User.create({ ...req.body });
      const token = jwt.sign({ id: user?._id }, 'health', { expiresIn: '30d' });
      return res.status(200).json({ status: "ok", data: user, token });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// 2. Get all users
const getusers = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;

    // Build base query
    const query = {};

    if (req.query.role) {
      query.role = req.query.role;
    }

    // Search condition
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query).sort({createdAt:-1})
      .populate(['departmentId'])
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(query);

    return res.status(200).json({
      status: "ok",
      data: users,
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



// 3. Get user by id
const getuserById = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    return res.status(200).json({ status: "ok", data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update user
const updateuser = async (req, res) => {
  try {
    let id = req.params.id;
    let getImage = await User.findById(id);
    
    // Safely handle the image file
    let image = getImage.image; // default to existing image
    
    if (req.files && req.files.image && req.files.image[0]) {
      image = req.files.image[0].filename;
    }

    const updateduser = await User.findByIdAndUpdate(
      id,
      { ...req.body, image: image },
      { new: true }
    );
    return res.status(200).json({ status: "ok", data: updateduser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Delete user
const deleteuser = async (req, res) => {
  try {
    const id = req.params.id;
    await User.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ status: "ok", message: "user deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  adduser,
  getusers,
  getuserById,
  updateuser,
  deleteuser,

};
