import { ArrowUpRight, Info, ShieldAlert } from "lucide-react";

export function PriorityScore({ brief }) {
  if (!brief)
    return (
      <span className="priority-score priority-score-watch">
        Awaiting signal
      </span>
    );
  return (
    <span
      className={`priority-score priority-score-${brief.level}`}
      title={brief.recommendation}
    >
      {brief.score} · {brief.label}
    </span>
  );
}

export default function PriorityBrief({ brief }) {
  if (!brief) return null;
  return (
    <section
      className={`priority-brief priority-brief-${brief.level}`}
      aria-labelledby="priority-brief-title"
    >
      <div className="priority-brief-heading">
        <span className="priority-brief-icon">
          <ShieldAlert size={17} />
        </span>
        <div>
          <p className="eyebrow">FIXNEARME CIVIC INTELLIGENCE</p>
          <h2 id="priority-brief-title">Priority brief</h2>
        </div>
        <PriorityScore brief={brief} />
      </div>
      <p className="priority-recommendation">
        <ArrowUpRight size={15} />
        {brief.recommendation}
      </p>
      <div
        className="priority-meter"
        role="img"
        aria-label={`Community priority signal ${brief.score} out of 100`}
      >
        <span style={{ width: `${brief.score}%` }} />
      </div>
      <ul className="priority-reasons">
        {brief.reasons.map((reason, index) => (
          <li key={`${reason.label}-${index}`}>
            <span>{reason.label}</span>
            <b>+{reason.points}</b>
          </li>
        ))}
      </ul>
      <p className="priority-disclaimer">
        <Info size={13} /> Assistive signal only. Staff should review the report
        before deciding how to respond.
      </p>
    </section>
  );
}
