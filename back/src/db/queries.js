const { Report, Category, User, ReportConfirmation } = require("./models");

async function reportViews(match = {}, options = {}) {
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: Category.collection.name,
        localField: "category",
        foreignField: "slug",
        as: "category_docs",
      },
    },
    {
      $lookup: {
        from: User.collection.name,
        localField: "assigned_to",
        foreignField: "id",
        as: "assignee_docs",
      },
    },
    {
      $lookup: {
        from: ReportConfirmation.collection.name,
        localField: "id",
        foreignField: "report_id",
        as: "confirmation_docs",
      },
    },
    {
      $set: {
        category_name: {
          $ifNull: [{ $arrayElemAt: ["$category_docs.name", 0] }, null],
        },
        assigned_to_name: {
          $ifNull: [{ $arrayElemAt: ["$assignee_docs.name", 0] }, null],
        },
        confirmations: { $size: "$confirmation_docs" },
      },
    },
    {
      $project: {
        _id: 0,
        category_docs: 0,
        assignee_docs: 0,
        confirmation_docs: 0,
      },
    },
  ];
  if (options.sort) pipeline.push({ $sort: options.sort });
  if (options.skip) pipeline.push({ $skip: options.skip });
  if (options.limit) pipeline.push({ $limit: options.limit });
  return Report.aggregate(pipeline);
}

module.exports = { reportViews };
