const express = require("express");
const { Report } = require("../db/models");
const asyncHandler = require("../utils/async-handler");
const { optionalAuthenticate } = require("../middleware/auth");

const router = express.Router();
router.get(
  "/stats",
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const staffScope = req.user?.role === "staff";
    const filter = staffScope ? { assigned_to: req.user.id } : {};
    const reports = await Report.find(filter)
      .select(
        "id title category neighborhood status priority assigned_to created_at",
      )
      .lean();
    const c = reports.reduce(
      (counts, report) => {
        counts.total += 1;
        counts[report.status] += 1;
        if (!["resolved", "rejected"].includes(report.status)) {
          if (report.priority === "urgent") counts.urgent_open += 1;
          if (report.assigned_to == null) counts.unassigned += 1;
        }
        return counts;
      },
      {
        total: 0,
        reported: 0,
        under_review: 0,
        in_progress: 0,
        pending_verification: 0,
        resolved: 0,
        rejected: 0,
        urgent_open: 0,
        unassigned: 0,
      },
    );
    const categoryCounts = new Map();
    for (const report of reports) {
      categoryCounts.set(
        report.category,
        (categoryCounts.get(report.category) || 0) + 1,
      );
    }
    const categories = [...categoryCounts]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    const recent = await Report.find(filter)
      .select("id title category neighborhood status priority created_at -_id")
      .sort({ created_at: -1, id: -1 })
      .limit(5)
      .lean();
    res.json({
      data: {
        total: c.total,
        by_status: {
          reported: c.reported,
          under_review: c.under_review,
          in_progress: c.in_progress,
          pending_verification: c.pending_verification,
          resolved: c.resolved,
          rejected: c.rejected,
        },
        urgent_open: c.urgent_open,
        unassigned: c.unassigned,
        by_category: categories,
        recent,
      },
    });
  }),
);

module.exports = router;
