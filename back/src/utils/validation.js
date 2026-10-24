const { z } = require("zod");

const categorySlug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
const statuses = [
  "reported",
  "under_review",
  "in_progress",
  "pending_verification",
  "resolved",
  "rejected",
];
const priorities = ["low", "medium", "high", "urgent"];
const reportSchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(5000),
  category: categorySlug,
  neighborhood: z.string().trim().min(2).max(120),
  landmark: z.string().trim().max(255).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
});

module.exports = { z, categorySlug, statuses, priorities, reportSchema };
