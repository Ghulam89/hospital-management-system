
const roomController = require("../controllers/roomController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, roomController.getrooms);
router.post(
  "/create",
  optionalAuth,
  roomController.addroom
);

router.get("/get/:id", optionalAuth, roomController.getroomById);
router.put(
  "/update/:id",
  optionalAuth,
  roomController.updateroom
);
router.delete("/delete/:id", optionalAuth, roomController.deleteroom);

module.exports = router;
