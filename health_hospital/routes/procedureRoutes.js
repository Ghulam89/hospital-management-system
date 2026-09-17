
const procedureController = require("../controllers/procedureController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth, auth, requireSuperAdmin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, procedureController.getprocedures);
router.post("/create", auth, procedureController.addprocedure);
router.post("/createExcel", auth, procedureController.addExcelprocedure);

router.get("/get/:id", optionalAuth, procedureController.getprocedureById);
router.put("/update/:id", auth, procedureController.updateprocedure);
router.delete("/delete/:id", auth, requireSuperAdmin, procedureController.deleteprocedure);

module.exports = router;
