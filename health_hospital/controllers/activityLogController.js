const ActivityLog = require('../models/activityLogModel');
const Branch = require('../models/branchModel');
const { normalizeRole } = require('../middleware/auth');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const getActivityLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limit, 10) || 25));
    const query = {};
    const role = normalizeRole(req.user?.role);

    if (role !== 'superadmin') {
      return res.status(403).json({ status: 'fail', message: 'Only superadmin can view activity logs' });
    }

    // The audit screen is for monitoring branch users, not the superadmin's own browsing.
    query.actorRole = { $not: /super\s*admin|superadmin/i };

    if (req.query.branchId) query.branchId = req.query.branchId;
    query.action = /^Logged in$/i;
    if (req.query.user) {
      const pattern = new RegExp(escapeRegex(req.query.user), 'i');
      query.$or = [{ actorName: pattern }, { actorEmail: pattern }];
    }
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) query.createdAt.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
      if (req.query.to) query.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
    }

    const [data, count, branches] = await Promise.all([
      ActivityLog.find(query)
        .populate('branchId', 'name code')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
      Branch.find({ isActive: { $ne: false } }).select('_id name code').sort({ name: 1 }).lean(),
    ]);

    return res.status(200).json({
      status: 'ok',
      data,
      count,
      page,
      limit,
      branches,
    });
  } catch (error) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

module.exports = { getActivityLogs };
