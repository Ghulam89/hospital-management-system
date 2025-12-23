
const procedureController = require("../controllers/procedureController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", procedureController.getprocedures);
router.post(
  "/create",
  procedureController.addprocedure
);
router.post(
  "/createExcel",
  procedureController.addExcelprocedure
);

router.get("/get/:id", procedureController.getprocedureById);
router.put(
  "/update/:id",
  procedureController.updateprocedure
);
router.delete("/delete/:id", procedureController.deleteprocedure);

module.exports = router;
