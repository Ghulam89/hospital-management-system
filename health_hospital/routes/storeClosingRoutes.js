const storeClosingController = require("../controllers/storeClosingController");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, storeClosingController.getStoreClosings);
router.post("/create", optionalAuth, storeClosingController.createStoreClosing);
router.get("/get/:id", optionalAuth, storeClosingController.getStoreClosingById);
router.put("/update/:id", optionalAuth, storeClosingController.updateStoreClosing);
router.delete("/delete/:id", optionalAuth, storeClosingController.deleteStoreClosing);

module.exports = router;
