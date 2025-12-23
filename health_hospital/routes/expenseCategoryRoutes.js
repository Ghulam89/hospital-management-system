
const expenseCategoryController = require("../controllers/expenseCategoryController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", expenseCategoryController.getexpenseCategorys);
router.post(
  "/create",
  expenseCategoryController.addexpenseCategory
);

router.get("/get/:id", expenseCategoryController.getexpenseCategoryById);
router.put(
  "/update/:id",
  expenseCategoryController.updateexpenseCategory
);
router.delete("/delete/:id", expenseCategoryController.deleteexpenseCategory);

module.exports = router;
