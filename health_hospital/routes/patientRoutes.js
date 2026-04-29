
const patientController = require("../controllers/patientController");
const { upload } = require("../upload/UploadFile");
const { auth } = require("../middleware/auth");

const router = require("express").Router();

router.get("/search", auth, patientController.searchPatients);
router.get("/check-cnic", auth, patientController.checkCnicForBranch);
router.get("/:id/full-history", auth, patientController.getPatientFullHistory);

router.get("/get", auth, patientController.getpatients);
router.post(
  "/create",
  auth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  patientController.addpatient
);

router.get("/get/:id", auth, patientController.getpatientById);
router.get("/ledger/:patientId", auth, patientController.getCustomerLedger);
router.post("/ledger-payment/:patientId", auth, patientController.addCustomerLedgerPayment);
router.post("/ledger-payment/:patientId/:invoiceId", auth, patientController.addCustomerInvoiceLedgerPayment);
router.put("/ledger-payment/:patientId/:invoiceId/:paymentId", auth, patientController.updateCustomerLedgerPayment);
router.delete("/ledger-payment/:patientId/:invoiceId/:paymentId", auth, patientController.deleteCustomerLedgerPayment);

router.put(
  "/update/:id",
  auth,
  upload.fields([{ name: "image", maxCount: 1 }]),
  patientController.updatepatient
);
router.delete("/delete/:id", auth, patientController.deletepatient);

module.exports = router;
