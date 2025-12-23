
const departmentController = require("../controllers/departmentController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", departmentController.getdepartments);
router.post(
  "/create",
  departmentController.adddepartment
);

router.get("/get/:id", departmentController.getdepartmentById);
router.put(
  "/update/:id",
  departmentController.updatedepartment
);
router.delete("/delete/:id", departmentController.deletedepartment);

module.exports = router;
