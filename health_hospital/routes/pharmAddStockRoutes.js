
const PharmAddStockController = require("../controllers/pharmAddStockController");
const { upload } = require("../upload/UploadFile");

const router = require("express").Router();

router.get("/get", PharmAddStockController.getpharmAddStocks);
router.post(
  "/create",
  PharmAddStockController.addpharmAddStock
);

router.get("/get/:id", PharmAddStockController.getpharmAddStockById);
router.put(
  "/update/:id",
  PharmAddStockController.updatepharmAddStock
);
router.delete("/delete/:id", PharmAddStockController.deletepharmAddStock);

module.exports = router;
