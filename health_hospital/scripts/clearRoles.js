/**
 * Removes all documents from the roles collection (Roles & Permissions matrix in MongoDB).
 * Does not modify User documents — re-assign staff roles in the app after clearing.
 *
 * Usage (from health_hospital): node scripts/clearRoles.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Role = require('../models/roleModel');

const main = async () => {
  if (!process.env.URL) {
    throw new Error('Missing URL in .env');
  }

  await mongoose.connect(process.env.URL, { writeConcern: { w: 'majority' } });
  console.log('DB connected');

  const result = await Role.deleteMany({});
  console.log('Roles collection cleared. Deleted count:', result.deletedCount);
};

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(err.message || err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
