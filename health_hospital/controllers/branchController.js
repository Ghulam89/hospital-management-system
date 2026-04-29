const Branch = require('../models/branchModel');
const User = require('../models/userModel');
const { normalizeRole } = require('../middleware/auth');

const createBranch = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const code = String(req.body.code || '').trim() || undefined;

    if (!name) {
      return res.status(400).json({ status: 'fail', message: 'Branch name is required' });
    }

    const branch = await Branch.create({
      name,
      code,
      address: req.body.address,
      location: req.body.location,
      phone: req.body.phone,
      isActive: req.body.isActive ?? true,
      createdById: req.user?._id,
    });

    return res.status(200).json({ status: 'ok', data: branch });
  } catch (err) {
    const message = err?.code === 11000 ? 'Branch already exists' : err.message;
    return res.status(500).json({ status: 'fail', message });
  }
};

const getBranches = async (req, res) => {
  try {
    const search = String(req.query.search || '');
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const limit = parseInt(String(req.query.limit || '20'), 10) || 20;

    const role = normalizeRole(req.user?.role);
    const query = {};

    if (role === 'administrator' || role === 'admin') {
      if (!req.user?.branchId) {
        return res.status(200).json({
          status: 'ok',
          data: [],
          search,
          page,
          count: 0,
          totalPages: 0,
          currentPage: page,
          limit,
        });
      }
      query._id = req.user.branchId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const branches = await Branch.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await Branch.countDocuments(query);

    return res.status(200).json({
      status: 'ok',
      data: branches,
      search,
      page,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit,
    });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

const getBranchById = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    if ((role === 'administrator' || role === 'admin') && req.user?.branchId) {
      if (String(req.user.branchId) !== String(req.params.id)) {
        return res.status(404).json({ status: 'fail', message: 'Branch not found' });
      }
    }
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ status: 'fail', message: 'Branch not found' });
    }
    return res.status(200).json({ status: 'ok', data: branch });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

const updateBranch = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = {};

    if (req.body.name !== undefined) payload.name = String(req.body.name || '').trim();
    if (req.body.code !== undefined) payload.code = String(req.body.code || '').trim() || undefined;
    if (req.body.address !== undefined) payload.address = req.body.address;
    if (req.body.location !== undefined) payload.location = req.body.location;
    if (req.body.phone !== undefined) payload.phone = req.body.phone;
    if (req.body.isActive !== undefined) payload.isActive = req.body.isActive;

    const updated = await Branch.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) {
      return res.status(404).json({ status: 'fail', message: 'Branch not found' });
    }
    return res.status(200).json({ status: 'ok', data: updated });
  } catch (err) {
    const message = err?.code === 11000 ? 'Branch already exists' : err.message;
    return res.status(500).json({ status: 'fail', message });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const id = req.params.id;
    const usedByUsers = await User.countDocuments({ branchId: id });
    if (usedByUsers > 0) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Branch is assigned to users' });
    }

    const deleted = await Branch.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: 'fail', message: 'Branch not found' });
    }
    return res.status(200).json({ status: 'ok', message: 'Branch deleted successfully' });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

const createBranchAdmin = async (req, res) => {
  try {
    const branchId = req.params.id;
    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      return res.status(404).json({ status: 'fail', message: 'Branch not found' });
    }

    const email = req.body.email;
    const phone = req.body.phone;

    if (!email || !phone || !req.body.password) {
      return res.status(400).json({ status: 'fail', message: 'Email, phone and password are required' });
    }

    const checkPhone = await User.findOne({ phone });
    const checkEmail = await User.findOne({ email });

    if (checkEmail) {
      return res.status(400).json({ status: 'fail', message: 'Email already exist!' });
    }

    if (checkPhone) {
      return res.status(400).json({ status: 'fail', message: 'Phone already exist!' });
    }

    const user = await User.create({
      ...req.body,
      role: 'administrator',
      branchId,
      createdById: req.user?._id,
    });

    return res.status(200).json({ status: 'ok', data: user });
  } catch (err) {
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  createBranchAdmin,
};
