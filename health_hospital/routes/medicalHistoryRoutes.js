
const medicalHistoryController = require("../controllers/medicalHistoryController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, medicalHistoryController.getDetails);
router.post(
  "/create",
  optionalAuth,
  medicalHistoryController.addDetail
);

router.get("/get/:id", optionalAuth, medicalHistoryController.getDetailById);
router.put(
  "/update/:id",
  optionalAuth,
  medicalHistoryController.updateDetail
);
router.delete("/delete/:id", optionalAuth, medicalHistoryController.deleteDetail);

module.exports = router;
