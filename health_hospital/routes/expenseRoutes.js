
const expenseController = require("../controllers/expenseController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/get", optionalAuth, expenseController.getexpenses);
router.get("/summary", optionalAuth, expenseController.getExpenseSummary);
router.post(
  "/create",
  optionalAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  expenseController.addexpense
);

router.get("/get/:id", optionalAuth, expenseController.getexpenseById);
router.put(
  "/update/:id",
  optionalAuth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  expenseController.updateexpense
);
router.delete("/delete/:id", optionalAuth, expenseController.deleteexpense);

module.exports = router;
