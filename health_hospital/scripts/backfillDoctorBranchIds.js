/**
 * Sets branchId on every User with role "doctor" (Mongo users collection).
 *
 * Usage:
 *   node scripts/backfillDoctorBranchIds.js <24-char ObjectId>
 *
 * Or set BACKFILL_BRANCH_ID or DOCTOR_BACKFILL_BRANCH_ID in .env
 *
 * Loads DB URL from process.env.URL or process.env.MONGODB_URI (same as server).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/userModel');

async function main() {
  const uri = process.env.URL || process.env.MONGODB_URI;
  const branchArg =
    process.argv[2] ||
    process.env.DOCTOR_BACKFILL_BRANCH_ID ||
    process.env.BACKFILL_BRANCH_ID ||
    process.env.APPOINTMENT_BACKFILL_BRANCH_ID;

  if (!uri) {
    console.error('Missing URL / MONGODB_URI in .env');
    process.exit(1);
  }
  if (!branchArg || !mongoose.Types.ObjectId.isValid(String(branchArg))) {
    console.error(
      'Provide a valid branch ObjectId as argv[2] or DOCTOR_BACKFILL_BRANCH_ID / BACKFILL_BRANCH_ID in .env',
    );
    process.exit(1);
  }

  const branchId = new mongoose.Types.ObjectId(String(branchArg));

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collName = User.collection.collectionName;
  console.log('Connected database:', db.databaseName);
  console.log('Target collection:', collName);
  console.log('Filter: role matches /^doctor$/i');

  /** Matches `doctor`, `Doctor`, etc. (still excludes unrelated roles). */
  const doctorFilter = { role: { $regex: /^doctor$/i } };

  const coll = db.collection(collName);

  const totalDoctors = await coll.countDocuments(doctorFilter);
  console.log('Doctor documents:', totalDoctors);

  if (totalDoctors === 0) {
    console.warn(
      'No users matched /^doctor$/i on role. Check Compass for actual role strings.',
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const missingBefore = await coll.countDocuments({
    ...doctorFilter,
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  });
  console.log('Doctors without branchId (before):', missingBefore);

  const result = await coll.updateMany(doctorFilter, { $set: { branchId } });
  console.log('updateMany matched:', result.matchedCount, 'modified:', result.modifiedCount);

  const missingAfter = await coll.countDocuments({
    ...doctorFilter,
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  });
  console.log('Doctors without branchId (after):', missingAfter);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
