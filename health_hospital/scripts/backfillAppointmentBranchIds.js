/**
 * Sets branchId on every document in the appointments collection (raw MongoDB driver).
 *
 * Usage:
 *   node scripts/backfillAppointmentBranchIds.js <24-char ObjectId>
 *   node scripts/backfillAppointmentBranchIds.js <branchId> --collection=appointments
 *
 * Or set APPOINTMENT_BACKFILL_BRANCH_ID or BACKFILL_BRANCH_ID in .env
 *
 * Loads DB URL from process.env.URL or process.env.MONGODB_URI (same as server).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Appointment = require('../models/appointmentModel');

function parseArgs(argv) {
  const branchArg = argv.find((a) => !a.startsWith('--'));
  const collFlag = argv.find((a) => a.startsWith('--collection='));
  const collectionOverride = collFlag ? collFlag.split('=')[1]?.trim() : null;
  return { branchArg, collectionOverride };
}

async function main() {
  const uri = process.env.URL || process.env.MONGODB_URI;
  const argvRest = process.argv.slice(2);
  const { branchArg: branchFromArgv, collectionOverride } = parseArgs(argvRest);
  const branchArg =
    branchFromArgv ||
    process.env.APPOINTMENT_BACKFILL_BRANCH_ID ||
    process.env.BACKFILL_BRANCH_ID;

  if (!uri) {
    console.error('Missing URL / MONGODB_URI in .env');
    process.exit(1);
  }
  if (!branchArg || !mongoose.Types.ObjectId.isValid(String(branchArg))) {
    console.error(
      'Provide a valid branch ObjectId as first argument or APPOINTMENT_BACKFILL_BRANCH_ID / BACKFILL_BRANCH_ID in .env',
    );
    process.exit(1);
  }

  const branchId = new mongoose.Types.ObjectId(String(branchArg));

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const dbName = db.databaseName;

  const collName = collectionOverride || Appointment.collection.collectionName;

  const allCols = await db.listCollections().toArray();
  const aptLike = allCols.map((c) => c.name).filter((n) => /appointment/i.test(n));
  console.log('Connected database:', dbName);
  console.log('Target collection:', collName);
  console.log('Collections matching "appointment":', aptLike.length ? aptLike.join(', ') : '(none)');

  const coll = db.collection(collName);
  const total = await coll.countDocuments({});
  const missingFilter = {
    $or: [{ branchId: { $exists: false } }, { branchId: null }],
  };
  const missingBefore = await coll.countDocuments(missingFilter);
  console.log('Documents total:', total);
  console.log('Documents without branchId (before):', missingBefore);

  if (total === 0) {
    console.warn(
      'No documents in this collection. In Compass, confirm DB name "' +
        dbName +
        '" and that data lives in one of: ' +
        (aptLike.length ? aptLike.join(', ') : collName),
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const result = await coll.updateMany({}, { $set: { branchId } });
  console.log('updateMany matched:', result.matchedCount, 'modified:', result.modifiedCount);

  const missingAfter = await coll.countDocuments(missingFilter);
  const sampleMissing = missingAfter
    ? await coll.findOne(missingFilter, { projection: { _id: 1, branchId: 1 } })
    : null;

  console.log('Documents without branchId (after):', missingAfter);
  if (sampleMissing) {
    console.warn('Example doc still missing branchId:', sampleMissing);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
