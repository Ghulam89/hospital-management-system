const storeClosingController = require("../controllers/storeClosingController");
const { auth, requireSuperAdmin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", auth, storeClosingController.getStoreClosings);
router.get("/prep", auth, storeClosingController.getStoreClosingPrep);
router.post("/create", auth, storeClosingController.createStoreClosing);
router.get("/get/:id", auth, storeClosingController.getStoreClosingById);
router.put("/update/:id", auth, requireSuperAdmin, storeClosingController.updateStoreClosing);
router.delete("/delete/:id", auth, requireSuperAdmin, storeClosingController.deleteStoreClosing);

module.exports = router;
