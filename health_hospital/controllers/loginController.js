const User = require('../models/userModel');
const { refreshUserTabsFromRole } = require('../utils/syncUserTabsFromRole');
const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/activityLogModel');

const loginuser = async (req, res) => {
  try {
    console.log(req.body);
    const info = {
      email: req.body.email,
      password: req.body.password,
    };

    const userData = await User.findOne({ email: info.email });

    if (userData) {
      if (req.body.password === userData.password) {
        const prevCount = parseInt(String(userData?.loginCount ?? '0'), 10);
        const count = Number.isFinite(prevCount) ? prevCount + 1 : 1;
        const now = new Date();

        const updateduser = await User.findByIdAndUpdate(
          userData?._id,
          { lastLogin: now, lastSignedIn: now, loginCount: count },
          { new: true },
        );

        const refreshed = await refreshUserTabsFromRole(updateduser);
        const payload = refreshed || updateduser;

        const token = jwt.sign({ id: userData?._id }, 'health', { expiresIn: '30d' });

        ActivityLog.create({
          actorId: userData._id,
          actorName: userData.name,
          actorEmail: userData.email,
          actorRole: userData.role,
          branchId: userData.branchId || null,
          module: 'Authentication',
          action: 'Logged in',
          method: 'POST',
          path: '/apis/login/user',
          statusCode: 200,
          ipAddress: req.clientIp || req.ip || '',
        }).catch(() => {});

        return res.status(200).json({
          status: 'ok',
          message: 'Successfully logged in',
          data: payload,
          token,
        });
      }
      return res.status(200).json({
        status: 'fail',
        message: 'Wrong loginPassword',
      });
    }
    return res.status(200).json({
      status: 'fail',
      message: 'Email not found',
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

const forgetuserloginPassword = async (req, res) => {
  try {
    const info = {
      email: req.body.email,
      phone: req.body.phone,
    };

    const guser = await User.findOne(info);

    if (guser) {
      return res.status(200).json({
        status: 'ok',
        data: guser,
      });
    }
    return res.status(200).json({
      status: 'fail',
      message: 'First Register yourself!',
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

const updateuserloginPassword = async (req, res) => {
  try {
    const info = {
      email: req.body.email,
      phone: req.body.phone,
    };

    const guser = await User.findOne(info);

    if (guser) {
      await User.findByIdAndUpdate(guser?._id, { password: req.body.password }, { new: true });

      return res.status(200).json({
        status: 'ok',
        message: 'Updated Successfully',
        data: guser,
      });
    }
    return res.status(200).json({
      status: 'fail',
      message: 'First Register yourself!',
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = {
  loginuser,
  forgetuserloginPassword,
  updateuserloginPassword,
};
