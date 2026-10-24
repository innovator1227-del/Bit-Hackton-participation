function tokenize(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g) || [],
  );
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findDuplicateReports(candidates, report, threshold = 60) {
  const inputWords = tokenize(`${report.title} ${report.description}`);
  return candidates
    .map((candidate) => {
      let score = 25;
      const reasons = ["Same category"];
      if (
        report.neighborhood.toLowerCase() ===
        candidate.neighborhood.toLowerCase()
      ) {
        score += 20;
        reasons.push("Same neighborhood");
      }
      if (
        report.landmark &&
        candidate.landmark &&
        report.landmark.toLowerCase() === candidate.landmark.toLowerCase()
      ) {
        score += 20;
        reasons.push("Same landmark");
      }

      const candidateWords = tokenize(
        `${candidate.title} ${candidate.description}`,
      );
      const overlap = [...candidateWords].filter((word) =>
        inputWords.has(word),
      ).length;
      const similarity =
        overlap / Math.max(1, new Set([...inputWords, ...candidateWords]).size);
      if (similarity >= 0.12) {
        score += Math.round(Math.min(similarity / 0.5, 1) * 20);
        reasons.push("Similar title or description");
      }

      const coordinatesExist =
        report.latitude != null &&
        report.longitude != null &&
        candidate.latitude != null &&
        candidate.longitude != null;
      if (
        coordinatesExist &&
        distanceKm(
          Number(report.latitude),
          Number(report.longitude),
          Number(candidate.latitude),
          Number(candidate.longitude),
        ) < 0.5
      ) {
        score += 15;
        reasons.push("Within 500 metres");
      }
      return { report: candidate, score, reasons };
    })
    .filter((match) => match.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

module.exports = { findDuplicateReports, distanceKm };
