const test = require("node:test");
const assert = require("node:assert/strict");
const { reportSchema } = require("../src/utils/validation");

const validReport = {
  title: "Damaged streetlight on Main Road",
  description: "The lamp has been out for three evenings.",
  category: "streetlight",
  neighborhood: "Bole",
};

test("report schema accepts a valid report and normalizes coordinates", () => {
  const result = reportSchema.parse({
    ...validReport,
    latitude: "9.02",
    longitude: "38.74",
  });
  assert.equal(result.latitude, 9.02);
  assert.equal(result.longitude, 38.74);
});

test("report schema rejects a short title and malformed category key", () => {
  const result = reportSchema.safeParse({
    ...validReport,
    title: "Oops",
    category: "invalid category!",
  });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "title"));
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "category"));
});

test("report schema rejects invalid coordinate ranges", () => {
  const result = reportSchema.safeParse({
    ...validReport,
    latitude: 91,
    longitude: 38,
  });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "latitude"));
});
