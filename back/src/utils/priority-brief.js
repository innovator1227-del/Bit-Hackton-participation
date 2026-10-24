const priorityPoints = { low: 4, medium: 12, high: 25, urgent: 40 };
const openStatuses = new Set([
  "reported",
  "under_review",
  "in_progress",
  "pending_verification",
]);

const riskSignals = [
  {
    key: "safety",
    points: 32,
    label: "Possible immediate safety hazard",
    pattern:
      /\b(fire|smoke|sparking|live wire|exposed (?:wire|cable)|electric shock|electrocution|gas leak|sinkhole|collapse|collapsed|open manhole|falling wall)\b|እሳት|ጎርፍ|አደጋ/u,
  },
  {
    key: "health",
    points: 22,
    label: "Possible public health or water risk",
    pattern:
      /\b(sewage|sewer overflow|contaminated water|flood(?:ing)?|standing water|chemical spill|waste overflow|dirty water)\b|ፍሳሽ|ቆሻሻ|የተበከለ/u,
  },
  {
    key: "access",
    points: 14,
    label: "Could block safe access or essential routes",
    pattern:
      /\b(blocked road|road blocked|blocked sidewalk|sidewalk blocked|blocked entrance|wheelchair access|school entrance|clinic entrance|hospital entrance|crosswalk)\b/u,
  },
];

function getPriorityBrief(report, now = new Date()) {
  const text = `${report.title || ""} ${report.description || ""}`
    .normalize("NFKC")
    .toLowerCase();
  const signals = riskSignals.filter((signal) => signal.pattern.test(text));
  const reasons = [];
  let score = priorityPoints[report.priority] ?? priorityPoints.medium;

  reasons.push({
    label: `${(report.priority || "medium").toUpperCase()} selected priority`,
    points: score,
  });
  for (const signal of signals) {
    score += signal.points;
    reasons.push({ label: signal.label, points: signal.points });
  }

  const confirmations = Math.max(0, Number(report.confirmations) || 0);
  const communityPoints = Math.min(confirmations * 3, 15);
  if (communityPoints) {
    score += communityPoints;
    reasons.push({
      label: `${confirmations} neighbors confirmed this report`,
      points: communityPoints,
    });
  }

  const isOpen = openStatuses.has(report.status);
  const created = new Date(report.created_at);
  const ageDays = Number.isNaN(created.getTime())
    ? 0
    : Math.max(0, (now.getTime() - created.getTime()) / 86_400_000);
  const agePoints = isOpen ? Math.min(Math.floor(ageDays / 2) * 2, 12) : 0;
  if (agePoints) {
    score += agePoints;
    reasons.push({
      label: `Open for ${Math.floor(ageDays)} days`,
      points: agePoints,
    });
  }

  score = Math.min(100, score);
  const level =
    score >= 75
      ? "immediate"
      : score >= 50
        ? "elevated"
        : score >= 25
          ? "watch"
          : "routine";
  const recommendation = signals.some((signal) => signal.key === "safety")
    ? "Review the safety risk and dispatch the appropriate team."
    : signals.some((signal) => signal.key === "health")
      ? "Review for public health impact and prioritize a field check."
      : confirmations >= 3
        ? "Multiple neighbors report this issue; consider prioritizing a site visit."
        : isOpen && ageDays >= 4
          ? "This issue has waited several days; check assignment and next steps."
          : "Review the report and route it to the responsible category team.";

  return {
    score,
    level,
    label: {
      immediate: "Immediate review",
      elevated: "Elevated signal",
      watch: "Needs attention",
      routine: "Routine review",
    }[level],
    recommendation,
    reasons,
    confirmations,
    age_days: Math.floor(ageDays),
    has_location: report.latitude != null && report.longitude != null,
    assistive_only: true,
  };
}

function addPriorityBrief(report) {
  return { ...report, priority_brief: getPriorityBrief(report) };
}

module.exports = { getPriorityBrief, addPriorityBrief };
