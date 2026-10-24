const test = require("node:test");
const assert = require("node:assert/strict");
const { findDuplicateReports, distanceKm } = require("../src/utils/duplicates");

test("duplicate scoring returns clear reasons and leaves source reports unchanged", () => {
  const existing = {
    id: 12,
    title: "Broken streetlight near clinic",
    description: "The streetlight has been broken for several nights.",
    neighborhood: "Bole",
    landmark: "Bole clinic",
    latitude: "9.0200",
    longitude: "38.7400",
  };
  const snapshot = structuredClone(existing);
  const matches = findDuplicateReports(
    [existing],
    {
      title: "Broken streetlight near the clinic",
      description: "Streetlight broken near Bole clinic for several nights.",
      neighborhood: "Bole",
      landmark: "Bole clinic",
      latitude: 9.0201,
      longitude: 38.7401,
    },
    60,
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].report.id, 12);
  assert.ok(matches[0].score >= 60);
  assert.ok(matches[0].reasons.includes("Same landmark"));
  assert.ok(matches[0].reasons.includes("Within 500 metres"));
  assert.deepEqual(existing, snapshot);
});

test("unrelated reports do not pass a transparent suggestion threshold", () => {
  const [match] = findDuplicateReports(
    [
      {
        title: "Flooded drain",
        description: "Water damage",
        neighborhood: "Kirkos",
        landmark: null,
      },
    ],
    {
      title: "Pothole on road",
      description: "Large hole in asphalt",
      neighborhood: "Bole",
      landmark: null,
    },
    60,
  );
  assert.equal(match, undefined);
});

test("distance helper measures nearby coordinates in kilometres", () => {
  const distance = distanceKm(9.02, 38.74, 9.021, 38.74);
  assert.ok(distance > 0.1 && distance < 0.12);
});
