
const wardController = require("../controllers/wardController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, wardController.getwards);
router.post(
  "/create",
  optionalAuth,
  wardController.addward
);

router.get("/get/:id", optionalAuth, wardController.getwardById);
router.put(
  "/update/:id",
  optionalAuth,
  wardController.updateward
);
router.delete("/delete/:id", optionalAuth, wardController.deleteward);

module.exports = router;
