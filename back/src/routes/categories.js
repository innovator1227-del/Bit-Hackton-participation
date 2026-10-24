const express = require("express");
const { Category } = require("../db/models");
const asyncHandler = require("../utils/async-handler");

const router = express.Router();
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await Category.find({ is_active: true })
      .select("slug name description -_id")
      .sort({ name: 1 })
      .lean();
    res.json({ data: rows });
  }),
);

module.exports = router;
