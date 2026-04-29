const mongoose = require("mongoose");
const Visit = require("../models/visitModel");
const Patient = require("../models/patientModel");
const { normalizeRole } = require("../middleware/auth");
const { resolveBranchIdForNonSuperAdmin } = require("../utils/branchScope");

/**
 * POST /visits — open a branch-scoped encounter for a global patient.
 * Superadmin must send branchId (body or query). Branch users use their assigned branch.
 */
const createVisit = async (req, res) => {
  try {
    const {
      patientId,
      visitType,
      tokenId,
      appointmentId,
      admitPatientId,
      chiefComplaint,
      branchId: bodyBranch,
    } = req.body;

    if (!patientId || !mongoose.Types.ObjectId.isValid(String(patientId))) {
      return res.status(400).json({ status: "fail", message: "Valid patientId required" });
    }

    const patient = await Patient.findById(patientId).select("_id").lean();
    if (!patient) {
      return res.status(404).json({ status: "fail", message: "Patient not found" });
    }

    const role = normalizeRole(req.user?.role);
    let branchId;

    if (role === "superadmin") {
      const raw = bodyBranch ?? req.query?.branchId;
      if (raw == null || raw === "" || !mongoose.Types.ObjectId.isValid(String(raw))) {
        return res.status(400).json({
          status: "fail",
          message: "branchId is required for superadmin when creating a visit",
        });
      }
      branchId = new mongoose.Types.ObjectId(String(raw));
    } else {
      branchId = await resolveBranchIdForNonSuperAdmin(req);
      if (!branchId) {
        return res.status(403).json({ status: "fail", message: "Branch could not be resolved for this user" });
      }
    }

    const visit = await Visit.create({
      patientId,
      branchId,
      visitType: visitType || "OPD",
      tokenId: tokenId || undefined,
      appointmentId: appointmentId || undefined,
      admitPatientId: admitPatientId || undefined,
      chiefComplaint: chiefComplaint || undefined,
      createdById: req.user?._id,
    });

    return res.status(201).json({ status: "ok", data: visit });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { createVisit };
