const timeController = require('../controllers/timeController');

const router = require('express').Router();

/** No auth — needed before login so the client clock can sync. */
router.get('/now', timeController.getTrustedTime);

module.exports = router;
