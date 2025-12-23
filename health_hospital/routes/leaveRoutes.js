
const leaveController = require("../controllers/leaveController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", leaveController.getDetails);
router.post(
  "/create",
  leaveController.addDetail
);

router.get("/get/:id", leaveController.getDetailById);
router.put(
  "/update/:id",
  leaveController.updateDetail
);
router.delete("/delete/:id", leaveController.deleteDetail);

module.exports = router;
