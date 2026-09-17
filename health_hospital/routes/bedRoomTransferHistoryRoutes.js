const bedRoomTransferHistoryController = require('../controllers/bedRoomTransferHistoryController');
const { optionalAuth } = require('../middleware/auth');

const router = require('express').Router();

router.get('/get', optionalAuth, bedRoomTransferHistoryController.getTransferHistory);

module.exports = router;
