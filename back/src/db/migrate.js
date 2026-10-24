require("dotenv").config();
const { connectDb, disconnectDb } = require("./pool");
const {
  User,
  Report,
  ReportUpdate,
  ReportConfirmation,
  Category,
  Notification,
} = require("./models");

const seedCategories = [
  ["road_damage", "Road damage", "Potholes and damaged road surfaces"],
  ["streetlight", "Streetlight", "Broken or unreliable street lighting"],
  ["water_leak", "Water leak", "Leaking water pipes or public taps"],
  ["drainage", "Drainage", "Blocked or damaged drainage"],
  ["waste", "Waste", "Uncollected waste or illegal dumping"],
  ["sidewalk", "Sidewalk", "Damaged or obstructed sidewalks"],
  ["other", "Other", "Other neighborhood problems"],
];

async function migrate() {
  await connectDb();
  await Promise.all([
    User.init(),
    Report.init(),
    ReportUpdate.init(),
    ReportConfirmation.init(),
    Category.init(),
    Notification.init(),
  ]);
  for (const [slug, name, description] of seedCategories) {
    await Category.updateOne(
      { slug },
      { $setOnInsert: { slug, name, description, is_active: true } },
      { upsert: true },
    );
  }
  console.log(
    "MongoDB collections and indexes are ready; categories are seeded.",
  );
}

migrate()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
