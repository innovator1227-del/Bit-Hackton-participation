const mongoose = require("mongoose");

const { Schema } = mongoose;
const timestamps = { createdAt: "created_at", updatedAt: "updated_at" };

const counterSchema = new Schema({
  _id: { type: String, required: true },
  value: { type: Number, default: 0 },
});

const userSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, maxlength: 254 },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ["resident", "staff", "admin", "super_admin"],
      default: "resident",
    },
    category: { type: String, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps },
);
userSchema.index({ role: 1, is_active: 1 });

const reportSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true, maxlength: 180 },
    description: { type: String, required: true, maxlength: 5000 },
    image_url: { type: String, default: null },
    resolution_image_url: { type: String, default: null },
    category: { type: String, required: true, maxlength: 60 },
    neighborhood: { type: String, required: true, maxlength: 120 },
    landmark: { type: String, default: null, maxlength: 255 },
    latitude: { type: Number, default: null, min: -90, max: 90 },
    longitude: { type: Number, default: null, min: -180, max: 180 },
    status: {
      type: String,
      enum: [
        "reported",
        "under_review",
        "in_progress",
        "pending_verification",
        "resolved",
        "rejected",
      ],
      default: "reported",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    created_by: { type: Number, default: null },
    assigned_to: { type: Number, default: null },
    resolved_at: { type: Date, default: null },
  },
  { timestamps },
);
reportSchema.index({ status: 1, created_at: -1, id: -1 });
reportSchema.index({ category: 1 });
reportSchema.index({ priority: 1 });
reportSchema.index({ neighborhood: 1 });
reportSchema.index({ assigned_to: 1, status: 1 });
reportSchema.index({ title: "text", description: "text", landmark: "text" });

const reportUpdateSchema = new Schema({
  id: { type: Number, unique: true, index: true },
  report_id: { type: Number, required: true, index: true },
  user_id: { type: Number, default: null },
  old_status: { type: String, default: null },
  new_status: { type: String, default: null },
  old_priority: { type: String, default: null },
  new_priority: { type: String, default: null },
  old_assigned_to: { type: Number, default: null },
  new_assigned_to: { type: Number, default: null },
  note: { type: String, default: null, maxlength: 1000 },
  image_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});
reportUpdateSchema.index({ report_id: 1, created_at: 1, id: 1 });

const confirmationSchema = new Schema({
  report_id: { type: Number, required: true },
  user_id: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});
confirmationSchema.index({ report_id: 1, user_id: 1 }, { unique: true });

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, maxlength: 60 },
    name: { type: String, required: true, unique: true, maxlength: 80 },
    description: { type: String, default: null, maxlength: 255 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps },
);

const notificationSchema = new Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  report_id: { type: Number, required: true },
  type: { type: String, required: true, maxlength: 32 },
  title: { type: String, required: true, maxlength: 120 },
  body: { type: String, required: true, maxlength: 320 },
  created_at: { type: Date, default: Date.now },
  read_at: { type: Date, default: null },
});
notificationSchema.index({ user_id: 1, read_at: 1, created_at: -1, id: -1 });

const model = (name, schema) =>
  mongoose.models[name] || mongoose.model(name, schema);

const Counter = model("Counter", counterSchema);

async function nextId(name, session) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true, session },
  );
  return counter.value;
}

module.exports = {
  User: model("User", userSchema),
  Report: model("Report", reportSchema),
  ReportUpdate: model("ReportUpdate", reportUpdateSchema),
  ReportConfirmation: model("ReportConfirmation", confirmationSchema),
  Category: model("Category", categorySchema),
  Notification: model("Notification", notificationSchema),
  nextId,
};
