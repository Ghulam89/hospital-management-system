
const inDoorDutyController = require("../controllers/inDoorDutyController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, inDoorDutyController.getDetails);
router.post(
  "/create",
  optionalAuth,
  inDoorDutyController.addDetail
);

router.get("/get/:id", optionalAuth, inDoorDutyController.getDetailById);
router.put(
  "/update/:id",
  optionalAuth,
  inDoorDutyController.updateDetail
);
router.delete("/delete/:id", optionalAuth, inDoorDutyController.deleteDetail);

module.exports = router;
