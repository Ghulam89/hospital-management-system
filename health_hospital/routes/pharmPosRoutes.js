
const pharmPosController = require("../controllers/pharmPosController");
const { upload } = require("../upload/UploadFile");

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

router.get("/get", pharmPosController.getpharmPoss);
router.get("/summary", pharmPosController.getpharmPosSummary); // New separate summary endpoint
router.post(
  "/create",
  pharmPosController.addpharmPos
);

router.get("/get/:id", pharmPosController.getpharmPosById);
router.put(
  "/update/:id",
  pharmPosController.updatepharmPos
);
router.delete("/delete/:id", pharmPosController.deletepharmPos);

module.exports = router;
