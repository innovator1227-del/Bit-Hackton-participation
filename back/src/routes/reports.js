const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");
const {
  User,
  Report,
  ReportUpdate,
  ReportConfirmation,
  Category,
  Notification,
  nextId,
} = require("../db/models");
const { withTransaction } = require("../db/transaction");
const { reportViews } = require("../db/queries");
const asyncHandler = require("../utils/async-handler");
const {
  authenticate,
  optionalAuthenticate,
  allowRoles,
} = require("../middleware/auth");
const {
  z,
  categorySlug,
  statuses,
  priorities,
  reportSchema,
} = require("../utils/validation");
const { findDuplicateReports } = require("../utils/duplicates");
const { detectImageExtension } = require("../utils/image-type");
const { addPriorityBrief } = require("../utils/priority-brief");

const uploadDirectory = path.join(__dirname, "..", "..", "uploads");
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 8,
    parts: 9,
    fieldNameSize: 50,
    fieldSize: 5000,
    fieldNestingDepth: 0,
  },
}).single("image");
function parseReportImage(req, res, next) {
  uploadImage(req, res, (error) => {
    if (error) return next(error);
    if (!req.file) return next();
    req.imageExtension = detectImageExtension(req.file.buffer);
    if (!req.imageExtension)
      return res.status(400).json({
        error: {
          code: "INVALID_IMAGE_TYPE",
          message: "Upload a valid JPEG, PNG, or WebP image.",
        },
      });
    next();
  });
}

const router = express.Router();
function enrichReport(report, req) {
  const enriched = addPriorityBrief(report);
  const canSeePendingEvidence =
    ["admin", "super_admin"].includes(req.user?.role) ||
    (req.user?.role === "staff" &&
      String(report.assigned_to) === String(req.user.id));
  if (report.status !== "resolved" && !canSeePendingEvidence)
    delete enriched.resolution_image_url;
  return enriched;
}

router.get(
  "/",
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      search: z.string().trim().max(120).optional(),
      q: z.string().trim().max(120).optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      neighborhood: z.string().trim().max(120).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });
    const q = querySchema.parse(req.query);
    const filter = {};
    if (req.user?.role === "staff") filter.assigned_to = req.user.id;
    const search = q.search || q.q;
    if (search) {
      const term = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { landmark: { $regex: term, $options: "i" } },
      ];
    }
    for (const [field, value] of [
      ["category", q.category],
      ["status", q.status],
      ["priority", q.priority],
      ["neighborhood", q.neighborhood],
    ]) {
      if (!value) continue;
      const valid =
        field === "status"
          ? statuses
          : field === "priority"
            ? priorities
            : null;
      if (field === "category" && !categorySlug.safeParse(value).success)
        return res.status(400).json({
          error: {
            code: "INVALID_FILTER",
            message: "Invalid category filter.",
          },
        });
      if (valid && !valid.includes(value))
        return res.status(400).json({
          error: {
            code: "INVALID_FILTER",
            message: `Invalid ${field} filter.`,
          },
        });
      filter[field] =
        field === "neighborhood"
          ? {
              $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              $options: "i",
            }
          : value;
    }
    const offset = (q.page - 1) * q.limit;
    const [rows, total] = await Promise.all([
      reportViews(filter, {
        sort: { created_at: -1, id: -1 },
        skip: offset,
        limit: q.limit,
      }),
      Report.countDocuments(filter),
    ]);
    res.json({
      data: rows.map((row) => enrichReport(row, req)),
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        pages: Math.ceil(total / q.limit),
      },
    });
  }),
);

router.get(
  "/:id",
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const filter = { id: Number(req.params.id) };
    if (req.user?.role === "staff") filter.assigned_to = req.user.id;
    const rows = await reportViews(filter, { limit: 1 });
    if (!rows[0])
      return res.status(404).json({
        error: { code: "REPORT_NOT_FOUND", message: "Report not found." },
      });
    res.json({ data: enrichReport(rows[0], req) });
  }),
);

router.post(
  "/check-duplicates",
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    if (req.user?.role === "staff")
      return res.status(403).json({
        error: {
          code: "STAFF_SCOPE",
          message: "Staff can only review reports assigned to them.",
        },
      });
    const data = reportSchema.parse(req.body);
    const activeCategory = await Category.exists({
      slug: data.category,
      is_active: true,
    });
    if (!activeCategory)
      return res.status(400).json({
        error: {
          code: "INVALID_CATEGORY",
          message: "Choose an active report category.",
        },
      });
    const candidates = await Report.find({
      category: data.category,
      status: { $nin: ["resolved", "rejected"] },
    })
      .select(
        "id title description category neighborhood landmark latitude longitude status priority created_at -_id",
      )
      .sort({ created_at: -1 })
      .limit(200)
      .lean();
    const threshold = Number(process.env.DUPLICATE_THRESHOLD || 60);
    const matches = findDuplicateReports(candidates, data, threshold);
    res.json({ data: matches, threshold, suggestions_only: true });
  }),
);

router.post(
  "/",
  optionalAuthenticate,
  parseReportImage,
  asyncHandler(async (req, res) => {
    if (req.user?.role === "staff")
      return res.status(403).json({
        error: {
          code: "STAFF_SCOPE",
          message: "Staff accounts cannot submit community reports.",
        },
      });
    const data = reportSchema.parse(req.body);
    const activeCategory = await Category.exists({
      slug: data.category,
      is_active: true,
    });
    if (!activeCategory)
      return res.status(400).json({
        error: {
          code: "INVALID_CATEGORY",
          message: "Choose an active report category.",
        },
      });
    const userId = req.get("authorization") ? req.user?.id : null;
    let imageUrl = null;
    let imagePath = null;
    try {
      if (req.file) {
        const filename = `${crypto.randomUUID()}.${req.imageExtension}`;
        await fs.mkdir(uploadDirectory, { recursive: true });
        imagePath = path.join(uploadDirectory, filename);
        imageUrl = `/uploads/${filename}`;
        await fs.writeFile(imagePath, req.file.buffer, { flag: "wx" });
      }
      const id = await withTransaction(async (session) => {
        const reportId = await nextId("reports", session);
        await Report.create(
          [
            {
              id: reportId,
              ...data,
              image_url: imageUrl,
              landmark: data.landmark || null,
              latitude: data.latitude ?? null,
              longitude: data.longitude ?? null,
              created_by: userId || null,
            },
          ],
          { session },
        );
        const admins = await User.find({
          role: { $in: ["admin", "super_admin"] },
          is_active: true,
        })
          .select("id -_id")
          .session(session)
          .lean();
        if (admins.length) {
          const notifications = await Promise.all(
            admins.map(async ({ id: adminId }) => ({
              id: await nextId("notifications", session),
              user_id: adminId,
              report_id: reportId,
              type: "new_report",
              title: "New community report",
              body: `${data.title} · ${data.neighborhood}`.slice(0, 320),
            })),
          );
          await Notification.insertMany(notifications, { session });
        }
        await ReportUpdate.create(
          [
            {
              id: await nextId("report_updates", session),
              report_id: reportId,
              user_id: userId || null,
              old_status: null,
              new_status: "reported",
              old_priority: null,
              new_priority: "medium",
              note: "Report submitted",
            },
          ],
          { session },
        );
        return reportId;
      });
      res.status(201).json({
        data: {
          id,
          ...data,
          image_url: imageUrl,
          status: "reported",
          priority: "medium",
        },
      });
    } catch (error) {
      if (imagePath) await fs.unlink(imagePath).catch(() => {});
      throw error;
    }
  }),
);

router.post(
  "/:id/confirm",
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user.role === "staff")
      return res.status(403).json({
        error: {
          code: "STAFF_SCOPE",
          message: "Staff accounts cannot confirm community reports.",
        },
      });
    const report = await Report.exists({ id: Number(req.params.id) });
    if (!report)
      return res.status(404).json({
        error: { code: "REPORT_NOT_FOUND", message: "Report not found." },
      });
    try {
      await ReportConfirmation.create({
        report_id: Number(req.params.id),
        user_id: req.user.id,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      return res.status(409).json({
        error: {
          code: "ALREADY_CONFIRMED",
          message: "You already confirmed this report.",
        },
      });
    }
    res.status(201).json({ data: { confirmed: true } });
  }),
);

router.get(
  "/:id/updates",
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    if (req.user?.role === "staff") {
      const assigned = await Report.exists({
        id: Number(req.params.id),
        assigned_to: req.user.id,
      });
      if (!assigned)
        return res.status(404).json({
          error: { code: "REPORT_NOT_FOUND", message: "Report not found." },
        });
    }
    const updates = await ReportUpdate.find({
      report_id: Number(req.params.id),
    })
      .select(
        "id old_status new_status old_priority new_priority image_url old_assigned_to new_assigned_to note created_at user_id -_id",
      )
      .sort({ created_at: 1, id: 1 })
      .lean();
    const userIds = [
      ...new Set(
        updates
          .flatMap((update) => [
            update.user_id,
            update.old_assigned_to,
            update.new_assigned_to,
          ])
          .filter((id) => id != null),
      ),
    ];
    const users = await User.find({ id: { $in: userIds } })
      .select("id name -_id")
      .lean();
    const names = new Map(users.map((user) => [user.id, user.name]));
    const rows = updates.map(
      ({
        user_id: userId,
        old_assigned_to: oldAssignee,
        new_assigned_to: newAssignee,
        ...update
      }) => ({
        ...update,
        updated_by: names.get(userId) || null,
        old_assignee_name: names.get(oldAssignee) || null,
        new_assignee_name: names.get(newAssignee) || null,
      }),
    );
    const isStaff = req.user?.role === "staff";
    const canSeeAllEvidence =
      ["admin", "super_admin"].includes(req.user?.role) || isStaff;
    res.json({
      data: rows.map((row) => ({
        ...row,
        image_url:
          canSeeAllEvidence || row.new_status === "resolved"
            ? row.image_url
            : null,
      })),
    });
  }),
);

router.get(
  "/staff/assigned",
  authenticate,
  allowRoles("staff"),
  asyncHandler(async (req, res) => {
    const rows = await reportViews({ assigned_to: req.user.id });
    rows.sort(
      (a, b) =>
        (b.priority === "urgent") - (a.priority === "urgent") ||
        new Date(a.created_at) - new Date(b.created_at),
    );
    res.json({ data: rows.map((row) => enrichReport(row, req)) });
  }),
);

router.patch(
  "/staff/reports/:id",
  authenticate,
  allowRoles("staff"),
  parseReportImage,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.enum(["in_progress", "resolved"]).optional(),
        note: z.string().trim().max(1000).optional(),
      })
      .refine((v) => v.status || v.note, "Provide a status or note")
      .parse(req.body);
    if (body.status === "resolved" && !req.file)
      return res.status(400).json({
        error: {
          code: "RESOLUTION_PHOTO_REQUIRED",
          message:
            "Upload a photo showing the completed repair before submitting it for review.",
        },
      });
    if (req.file && body.status !== "resolved")
      return res.status(400).json({
        error: {
          code: "PHOTO_REQUIRES_RESOLUTION",
          message:
            "A completion photo can only be submitted when requesting resolution review.",
        },
      });
    let imagePath = null;
    try {
      let uploadedImageUrl = null;
      if (req.file) {
        const filename = `${crypto.randomUUID()}.${req.imageExtension}`;
        await fs.mkdir(uploadDirectory, { recursive: true });
        imagePath = path.join(uploadDirectory, filename);
        uploadedImageUrl = `/uploads/${filename}`;
        await fs.writeFile(imagePath, req.file.buffer, { flag: "wx" });
      }
      const outcome = await withTransaction(async (session) => {
        const report = await Report.findOne({ id: Number(req.params.id) })
          .session(session)
          .lean();
        if (!report)
          return {
            status: 404,
            error: { code: "REPORT_NOT_FOUND", message: "Report not found." },
          };
        if (String(report.assigned_to) !== String(req.user.id))
          return {
            status: 403,
            error: {
              code: "NOT_ASSIGNED",
              message: "You can update reports assigned to you.",
            },
          };
        if (
          ["pending_verification", "resolved", "rejected"].includes(
            report.status,
          )
        ) {
          return {
            status: 409,
            error: {
              code: "REPORT_NOT_EDITABLE",
              message:
                "This report is awaiting admin review or is already closed.",
            },
          };
        }
        const status =
          body.status === "resolved"
            ? "pending_verification"
            : body.status || report.status;
        const imageUrl = req.file
          ? uploadedImageUrl
          : report.resolution_image_url;
        await Report.updateOne(
          { id: report.id },
          {
            $set: { status, resolved_at: null, resolution_image_url: imageUrl },
          },
          { session },
        );
        const note =
          body.note ||
          (status === "pending_verification"
            ? "Completion photo submitted for admin review."
            : null);
        await ReportUpdate.create(
          [
            {
              id: await nextId("report_updates", session),
              report_id: report.id,
              user_id: req.user.id,
              old_status: report.status,
              new_status: status,
              old_priority: report.priority,
              new_priority: report.priority,
              old_assigned_to: report.assigned_to,
              new_assigned_to: report.assigned_to,
              note,
              image_url: req.file ? imageUrl : null,
            },
          ],
          { session },
        );
        return { data: { id: report.id, status } };
      });
      if (outcome.error) {
        if (imagePath) await fs.unlink(imagePath).catch(() => {});
        return res.status(outcome.status).json({ error: outcome.error });
      }
      res.json(outcome);
    } catch (error) {
      if (imagePath) await fs.unlink(imagePath).catch(() => {});
      throw error;
    }
  }),
);

module.exports = router;
