
const wardController = require("../controllers/wardController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", wardController.getwards);
router.post(
  "/create",
  wardController.addward
);

router.get("/get/:id", wardController.getwardById);
router.put(
  "/update/:id",
  wardController.updateward
);
router.delete("/delete/:id", wardController.deleteward);

module.exports = router;
