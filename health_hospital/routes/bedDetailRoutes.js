
const bedDetailController = require("../controllers/bedDetailController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, bedDetailController.getbedDetails);
router.post(
  "/create",
  optionalAuth,
  bedDetailController.addbedDetail
);

router.get("/get/:id", optionalAuth, bedDetailController.getbedDetailById);
router.put(
  "/update/:id",
  optionalAuth,
  bedDetailController.updatebedDetail
);
router.delete("/delete/:id", optionalAuth, bedDetailController.deletebedDetail);

module.exports = router;
