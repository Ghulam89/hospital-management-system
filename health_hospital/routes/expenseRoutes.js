
const expenseController = require("../controllers/expenseController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", expenseController.getexpenses);
router.post(
  "/create",
  upload.fields([{ name: "image", maxCount: 1 }]),
  expenseController.addexpense
);

router.get("/get/:id", expenseController.getexpenseById);
router.put(
  "/update/:id",
  upload.fields([{ name: "image", maxCount: 1 }]),
  expenseController.updateexpense
);
router.delete("/delete/:id", expenseController.deleteexpense);

module.exports = router;
