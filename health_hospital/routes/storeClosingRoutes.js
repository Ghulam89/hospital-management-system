const storeClosingController = require("../controllers/storeClosingController");

const router = require("express").Router();

router.get("/get", storeClosingController.getStoreClosings);
router.post("/create", storeClosingController.createStoreClosing);
router.get("/get/:id", storeClosingController.getStoreClosingById);
router.put("/update/:id", storeClosingController.updateStoreClosing);
router.delete("/delete/:id", storeClosingController.deleteStoreClosing);

module.exports = router;
