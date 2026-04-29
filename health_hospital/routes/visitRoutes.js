const router = require("express").Router();
const { auth } = require("../middleware/auth");
const visitController = require("../controllers/visitController");

router.post("/", auth, visitController.createVisit);

module.exports = router;
