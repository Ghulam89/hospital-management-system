
const familyHistoryController = require("../controllers/familyHistoryController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", familyHistoryController.getDetails);
router.post(
  "/create",
  familyHistoryController.addDetail
);

router.get("/get/:id", familyHistoryController.getDetailById);
router.put(
  "/update/:id",
  familyHistoryController.updateDetail
);
router.delete("/delete/:id", familyHistoryController.deleteDetail);

module.exports = router;
