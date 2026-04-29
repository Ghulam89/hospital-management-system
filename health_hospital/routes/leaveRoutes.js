
const leaveController = require("../controllers/leaveController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, leaveController.getDetails);
router.post(
  "/create",
  optionalAuth,
  leaveController.addDetail
);

router.get("/get/:id", optionalAuth, leaveController.getDetailById);
router.put(
  "/update/:id",
  optionalAuth,
  leaveController.updateDetail
);
router.delete("/delete/:id", optionalAuth, leaveController.deleteDetail);

module.exports = router;
