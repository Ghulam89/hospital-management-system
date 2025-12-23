
const medicalHistoryController = require("../controllers/medicalHistoryController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", medicalHistoryController.getDetails);
router.post(
  "/create",
  medicalHistoryController.addDetail
);

router.get("/get/:id", medicalHistoryController.getDetailById);
router.put(
  "/update/:id",
  medicalHistoryController.updateDetail
);
router.delete("/delete/:id", medicalHistoryController.deleteDetail);

module.exports = router;
