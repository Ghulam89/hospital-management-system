const clinicClosingController = require("../controllers/clinicClosingController");
const { auth, requireSuperAdmin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", auth, clinicClosingController.getClinicClosings);
router.get("/prep", auth, clinicClosingController.getClinicClosingPrep);
router.post("/create", auth, clinicClosingController.createClinicClosing);
router.get("/get/:id", auth, clinicClosingController.getClinicClosingById);
router.put("/update/:id", auth, requireSuperAdmin, clinicClosingController.updateClinicClosing);
router.delete("/delete/:id", auth, requireSuperAdmin, clinicClosingController.deleteClinicClosing);

module.exports = router;
