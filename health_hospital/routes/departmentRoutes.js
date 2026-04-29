
const departmentController = require("../controllers/departmentController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth, auth, requireSuperAdmin } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, departmentController.getdepartments);
router.post("/create", auth, requireSuperAdmin, departmentController.adddepartment);

router.get("/get/:id", optionalAuth, departmentController.getdepartmentById);
router.put("/update/:id", auth, requireSuperAdmin, departmentController.updatedepartment);
router.delete("/delete/:id", auth, requireSuperAdmin, departmentController.deletedepartment);

module.exports = router;
