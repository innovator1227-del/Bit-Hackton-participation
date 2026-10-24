const express = require("express");
const bcrypt = require("bcryptjs");
const {
  User,
  Report,
  ReportUpdate,
  Category,
  Notification,
  nextId,
} = require("../db/models");
const { withTransaction } = require("../db/transaction");
const { reportViews } = require("../db/queries");
const asyncHandler = require("../utils/async-handler");
const { authenticate, allowRoles } = require("../middleware/auth");
const {
  z,
  categorySlug,
  statuses,
  priorities,
} = require("../utils/validation");
const { addPriorityBrief } = require("../utils/priority-brief");

const router = express.Router();
router.get(
  "/reports",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const rows = await reportViews({}, { sort: { created_at: -1, id: -1 } });
    res.json({ data: rows.map(addPriorityBrief) });
  }),
);

router.patch(
  "/reports/:id",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.enum(statuses).optional(),
        priority: z.enum(priorities).optional(),
        assigned_to: z.number().int().positive().nullable().optional(),
        note: z.string().trim().max(1000).optional(),
      })
      .refine((v) => Object.keys(v).length > 0, "Provide a field to update")
      .refine((v) => v.status !== "rejected" || Boolean(v.note?.trim()), {
        message: "A reason is required when rejecting a report.",
        path: ["note"],
      })
      .parse(req.body);
    if ("assigned_to" in body && req.user.role !== "super_admin")
      return res.status(403).json({
        error: {
          code: "SUPER_ADMIN_REQUIRED",
          message: "Only a super admin can assign staff.",
        },
      });
    const outcome = await withTransaction(async (session) => {
      const report = await Report.findOne({ id: Number(req.params.id) })
        .session(session)
        .lean();
      if (!report)
        return {
          status: 404,
          error: { code: "REPORT_NOT_FOUND", message: "Report not found." },
        };
      if (
        body.status === "pending_verification" &&
        report.status !== "pending_verification"
      ) {
        return {
          status: 409,
          error: {
            code: "RESOLUTION_PHOTO_REQUIRED",
            message:
              "Only a staff completion photo can move a report to verification.",
          },
        };
      }
      if (body.status === "resolved" && report.status !== "resolved") {
        return {
          status: 409,
          error: {
            code: "RESOLUTION_REVIEW_REQUIRED",
            message:
              "Approve a staff completion photo in the review controls before resolving this report.",
          },
        };
      }
      if (
        report.status === "pending_verification" &&
        body.status &&
        body.status !== "pending_verification"
      ) {
        return {
          status: 409,
          error: {
            code: "RESOLUTION_REVIEW_REQUIRED",
            message:
              "Use the resolution review controls to approve the photo or request more work.",
          },
        };
      }
      let newAssignee = report.assigned_to;
      if ("assigned_to" in body) {
        newAssignee = body.assigned_to;
        if (newAssignee != null) {
          const staff = await User.exists({
            id: newAssignee,
            role: "staff",
            is_active: true,
            category: report.category,
          }).session(session);
          if (!staff)
            return {
              status: 400,
              error: {
                code: "INVALID_STAFF",
                message: "Choose an active staff account.",
              },
            };
        }
      }
      const status = body.status ?? report.status;
      const priority = body.priority ?? report.priority;
      const resolvedAt =
        status === "resolved"
          ? report.status === "resolved"
            ? report.resolved_at
            : new Date()
          : null;
      await Report.updateOne(
        { id: report.id },
        {
          $set: {
            status,
            priority,
            assigned_to: newAssignee,
            resolved_at: resolvedAt,
          },
        },
        { session },
      );
      const changed =
        status !== report.status ||
        priority !== report.priority ||
        String(newAssignee) !== String(report.assigned_to) ||
        body.note;
      if (changed)
        await ReportUpdate.create(
          [
            {
              id: await nextId("report_updates", session),
              report_id: report.id,
              user_id: req.user.id,
              old_status: report.status,
              new_status: status,
              old_priority: report.priority,
              new_priority: priority,
              old_assigned_to: report.assigned_to,
              new_assigned_to: newAssignee,
              note: body.note || null,
            },
          ],
          { session },
        );
      if (
        newAssignee != null &&
        String(newAssignee) !== String(report.assigned_to)
      ) {
        await Notification.create(
          [
            {
              id: await nextId("notifications", session),
              user_id: newAssignee,
              report_id: report.id,
              type: "report_assigned",
              title: "A report was assigned to you",
              body: report.title.slice(0, 320),
            },
          ],
          { session },
        );
      }
      return {
        data: { id: report.id, status, priority, assigned_to: newAssignee },
      };
    });
    if (outcome.error)
      return res.status(outcome.status).json({ error: outcome.error });
    res.json(outcome);
  }),
);

router.patch(
  "/reports/:id/review-resolution",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        decision: z.enum(["approve", "request_changes"]),
        note: z.string().trim().max(1000).optional(),
      })
      .refine(
        (value) =>
          value.decision !== "request_changes" ||
          Boolean(value.note?.length >= 3),
        {
          message: "Add a short note explaining what needs more work.",
          path: ["note"],
        },
      )
      .parse(req.body);
    const outcome = await withTransaction(async (session) => {
      const report = await Report.findOne({ id: Number(req.params.id) })
        .session(session)
        .lean();
      if (!report)
        return {
          status: 404,
          error: { code: "REPORT_NOT_FOUND", message: "Report not found." },
        };
      if (
        report.status !== "pending_verification" ||
        !report.resolution_image_url
      ) {
        return {
          status: 409,
          error: {
            code: "NO_RESOLUTION_PENDING",
            message: "This report has no completion photo awaiting review.",
          },
        };
      }
      const approved = body.decision === "approve";
      const status = approved ? "resolved" : "in_progress";
      const note =
        body.note || (approved ? "Admin approved the completion photo." : null);
      await Report.updateOne(
        { id: report.id },
        {
          $set: {
            status,
            resolved_at: approved ? new Date() : null,
            resolution_image_url: approved ? report.resolution_image_url : null,
          },
        },
        { session },
      );
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
            image_url: approved ? report.resolution_image_url : null,
          },
        ],
        { session },
      );
      return { data: { id: report.id, status, approved } };
    });
    if (outcome.error)
      return res.status(outcome.status).json({ error: outcome.error });
    res.json(outcome);
  }),
);

router.get(
  "/categories",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const rows = await Promise.all(
      categories.map(async (category) => ({
        slug: category.slug,
        name: category.name,
        description: category.description,
        is_active: category.is_active,
        created_at: category.created_at,
        report_count: await Report.countDocuments({ category: category.slug }),
        staff_count: await User.countDocuments({
          category: category.slug,
          role: "staff",
        }),
      })),
    );
    res.json({ data: rows });
  }),
);

router.post(
  "/categories",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(255).optional().default(""),
      })
      .parse(req.body);
    const slug = body.name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60)
      .replace(/_+$/g, "");
    if (!categorySlug.safeParse(slug).success)
      return res.status(400).json({
        error: {
          code: "INVALID_CATEGORY_NAME",
          message: "Use a name with at least one English letter or number.",
        },
      });
    await Category.create({
      slug,
      name: body.name,
      description: body.description || null,
    });
    res.status(201).json({
      data: {
        slug,
        name: body.name,
        description: body.description || null,
        is_active: true,
      },
    });
  }),
);

router.patch(
  "/categories/:slug",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        description: z.string().trim().max(255).nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .refine(
        (value) => Object.keys(value).length > 0,
        "Provide a category field to update",
      )
      .parse(req.body);
    const updates = {};
    for (const field of ["name", "description", "is_active"]) {
      if (Object.hasOwn(body, field)) {
        updates[field] =
          field === "description" && body[field] === "" ? null : body[field];
      }
    }
    const category = await Category.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    )
      .select("slug name description is_active -_id")
      .lean();
    if (!category)
      return res.status(404).json({
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "Category not found.",
        },
      });
    res.json({ data: category });
  }),
);

router.delete(
  "/categories/:slug",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const category = await Category.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: { is_active: false } },
    );
    if (!category)
      return res.status(404).json({
        error: { code: "CATEGORY_NOT_FOUND", message: "Category not found." },
      });
    res.json({
      data: { slug: req.params.slug, is_active: false, archived: true },
    });
  }),
);

router.get(
  "/staff",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const staff = await User.find({ role: "staff" })
      .select("id name email category is_active created_at -_id")
      .sort({ name: 1 })
      .lean();
    const categories = await Category.find().select("slug name -_id").lean();
    const categoryNames = new Map(
      categories.map(({ slug, name }) => [slug, name]),
    );
    const rows = await Promise.all(
      staff.map(async (member) => ({
        ...member,
        category_name: categoryNames.get(member.category) || null,
        assigned_reports: await Report.countDocuments({
          assigned_to: member.id,
        }),
        active_reports: await Report.countDocuments({
          assigned_to: member.id,
          status: "in_progress",
        }),
      })),
    );
    res.json({ data: rows });
  }),
);

router.post(
  "/staff",
  authenticate,
  allowRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        password: z.string().min(12).max(128),
        category: categorySlug,
      })
      .parse(req.body);
    const category = await Category.exists({
      slug: body.category,
      is_active: true,
    });
    if (!category)
      return res.status(400).json({
        error: {
          code: "INVALID_CATEGORY",
          message: "Choose an active staff category.",
        },
      });
    const hash = await bcrypt.hash(body.password, 12);
    const id = await nextId("users");
    await User.create({
      id,
      name: body.name,
      email: body.email,
      password_hash: hash,
      role: "staff",
      category: body.category,
    });
    res.status(201).json({
      data: {
        id,
        name: body.name,
        email: body.email,
        role: "staff",
        category: body.category,
      },
    });
  }),
);

router.use(authenticate, allowRoles("super_admin"));

router.patch(
  "/staff/:id",
  asyncHandler(async (req, res) => {
    const body = z.object({ is_active: z.boolean() }).parse(req.body);
    const user = await User.findOneAndUpdate(
      { id: Number(req.params.id), role: "staff" },
      { $set: { is_active: body.is_active } },
    );
    if (!user)
      return res.status(404).json({
        error: {
          code: "STAFF_NOT_FOUND",
          message: "Staff member not found.",
        },
      });
    res.json({
      data: { id: Number(req.params.id), is_active: body.is_active },
    });
  }),
);

module.exports = router;
