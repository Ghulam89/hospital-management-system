
const roomController = require("../controllers/roomController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", roomController.getrooms);
router.post(
  "/create",
  roomController.addroom
);

router.get("/get/:id", roomController.getroomById);
router.put(
  "/update/:id",
  roomController.updateroom
);
router.delete("/delete/:id", roomController.deleteroom);

module.exports = router;
