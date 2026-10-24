require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDb, disconnectDb } = require("../db/pool");
const { User } = require("../db/models");

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error(
      "Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (at least 12 characters) for this command.",
    );
  }
  await connectDb();

  const user = await User.findOne({ email, role: "super_admin" })
    .select("id")
    .lean();
  if (!user)
    throw new Error(
      "No super-admin account matches that email. No password was changed.",
    );

  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne(
    { id: user.id },
    { $set: { password_hash: passwordHash } },
  );
  console.log(
    "Super-admin password updated. Sign in with that account email and your new password.",
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
