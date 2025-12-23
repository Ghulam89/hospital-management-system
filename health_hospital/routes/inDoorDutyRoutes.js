
const inDoorDutyController = require("../controllers/inDoorDutyController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", inDoorDutyController.getDetails);
router.post(
  "/create",
  inDoorDutyController.addDetail
);

router.get("/get/:id", inDoorDutyController.getDetailById);
router.put(
  "/update/:id",
  inDoorDutyController.updateDetail
);
router.delete("/delete/:id", inDoorDutyController.deleteDetail);

module.exports = router;
