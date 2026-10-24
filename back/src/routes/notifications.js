const express = require("express");
const { Notification } = require("../db/models");
const asyncHandler = require("../utils/async-handler");
const { authenticate, allowRoles } = require("../middleware/auth");
const { z } = require("../utils/validation");

const router = express.Router();
router.use(authenticate, allowRoles("admin", "super_admin", "staff"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(50).default(30) })
      .parse(req.query);
    const filter = { user_id: req.user.id };
    const [rows, unreadCount] = await Promise.all([
      Notification.find(filter)
        .select("id report_id type title body created_at read_at -_id")
        .sort({ created_at: -1, id: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ ...filter, read_at: null }),
    ]);
    res.json({ data: rows, unread_count: unreadCount });
  }),
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
      { user_id: req.user.id, read_at: null },
      { $set: { read_at: new Date() } },
    );
    res.json({ data: { marked_read: result.modifiedCount } });
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.coerce.number().int().positive() })
      .parse(req.params);
    const notification = await Notification.findOneAndUpdate(
      { id, user_id: req.user.id, read_at: null },
      { $set: { read_at: new Date() } },
    );
    if (!notification) {
      const exists = await Notification.exists({ id, user_id: req.user.id });
      if (exists) return res.json({ data: { id, read: true } });
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: "Notification not found.",
        },
      });
    }
    res.json({ data: { id, read: true } });
  }),
);

module.exports = router;
