const router = require('express').Router();
const { auth, requireSuperAdmin } = require('../middleware/auth');
const { getActivityLogs } = require('../controllers/activityLogController');

router.get('/get', auth, requireSuperAdmin, getActivityLogs);

module.exports = router;
