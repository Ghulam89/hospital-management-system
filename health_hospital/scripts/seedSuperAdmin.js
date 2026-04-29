const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/userModel');

const main = async () => {
  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com';
  const phone = process.env.SUPERADMIN_PHONE || '03001234567';
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';
  const password = process.env.SUPERADMIN_PASSWORD || '123456';
  const gender = process.env.SUPERADMIN_GENDER || 'Male';

  console.log('Seeding Super Admin...');

  if (!process.env.URL) {
    throw new Error('Missing URL in .env');
  }

  await mongoose.connect(process.env.URL, { writeConcern: { w: 'majority' } });
  console.log('DB connected');

  const anySuperAdmin = await User.findOne({
    role: { $in: ['superadmin', 'super admin', 'SuperAdmin', 'Super Admin'] },
  }).lean();

  if (anySuperAdmin) {
    console.log('Super Admin already exists:', anySuperAdmin.email);
    return;
  }

  const dup = await User.findOne({ $or: [{ email }, { phone }] }).lean();
  if (dup) {
    console.log('Email/Phone already exists:', dup.email);
    return;
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    gender,
    role: 'superadmin',
  });

  console.log('Created Super Admin:', String(user._id), email);
};

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(err.message || err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
