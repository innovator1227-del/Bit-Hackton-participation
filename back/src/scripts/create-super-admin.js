require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDb, disconnectDb } = require("../db/pool");
const { User, nextId } = require("../db/models");

async function main() {
  const {
    SUPER_ADMIN_NAME: name,
    SUPER_ADMIN_EMAIL: email,
    SUPER_ADMIN_PASSWORD: password,
  } = process.env;
  if (!name || !email || !password || password.length < 12) {
    throw new Error(
      "Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD (at least 12 characters) in your environment.",
    );
  }
  await connectDb();
  const existing = await User.exists({ role: "super_admin" });
  if (existing)
    throw new Error(
      "A super admin already exists. Use the authenticated staff-management API for later account changes.",
    );
  const hash = await bcrypt.hash(password, 12);
  const id = await nextId("users");
  await User.create({
    id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash: hash,
    role: "super_admin",
  });
  console.log(`Created initial super admin with user id ${id}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
