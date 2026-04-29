
const familyHistoryController = require("../controllers/familyHistoryController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, familyHistoryController.getDetails);
router.post(
  "/create",
  optionalAuth,
  familyHistoryController.addDetail
);

router.get("/get/:id", optionalAuth, familyHistoryController.getDetailById);
router.put(
  "/update/:id",
  optionalAuth,
  familyHistoryController.updateDetail
);
router.delete("/delete/:id", optionalAuth, familyHistoryController.deleteDetail);

module.exports = router;
