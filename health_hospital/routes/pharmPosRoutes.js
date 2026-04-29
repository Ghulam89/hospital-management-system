
const pharmPosController = require("../controllers/pharmPosController");
const { upload } = require("../upload/UploadFile");
const { optionalAuth } = require("../middleware/auth");

const router = require("express").Router();

// Quick test endpoint to verify database has data
router.get("/test", async (req, res) => {
  try {
    const PharmPos = require("../models/pharmPosModel");
    const count = await PharmPos.countDocuments();
    const sample = await PharmPos.findOne().sort({ createdAt: -1 });
    
    return res.status(200).json({
      status: "ok",
      message: "POS API is working!",
      databaseStats: {
        totalRecords: count,
        hasData: count > 0,
        latestTransaction: sample ? {
          id: sample._id,
          date: sample.createdAt,
          paid: sample.paid,
          due: sample.due,
          total: sample.paid + sample.due
        } : null
      }
    });
  } catch (err) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

router.get("/get", optionalAuth, pharmPosController.getpharmPoss);
router.get("/summary", optionalAuth, pharmPosController.getpharmPosSummary); // New separate summary endpoint
router.post("/ledger-payment/:patientId", optionalAuth, pharmPosController.addPatientPosLedgerPayment);
router.post("/ledger-payment/:patientId/:posId", optionalAuth, pharmPosController.addPatientPosInvoicePayment);
router.put("/ledger-payment/:patientId/:posId/:paymentId", optionalAuth, pharmPosController.updatePatientPosLedgerPayment);
router.delete("/ledger-payment/:patientId/:posId/:paymentId", optionalAuth, pharmPosController.deletePatientPosLedgerPayment);
router.post(
  "/create",
  optionalAuth,
  pharmPosController.addpharmPos
);

router.get("/get/:id", optionalAuth, pharmPosController.getpharmPosById);
router.get("/get-by-item/:itemId", optionalAuth, pharmPosController.getPosByItem);
router.put(
  "/update/:id",
  optionalAuth,
  pharmPosController.updatepharmPos
);
router.delete("/delete/:id", optionalAuth, pharmPosController.deletepharmPos);

module.exports = router;
