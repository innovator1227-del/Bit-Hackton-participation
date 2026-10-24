import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

const statuses = {
  reported: ["Reported", "badge-slate"],
  under_review: ["Under review", "badge-amber"],
  pending_verification: ["Pending verification", "badge-amber"],
  in_progress: ["In progress", "badge-blue"],
  resolved: ["Resolved", "badge-green"],
  rejected: ["Closed", "badge-red"],
};

export function StatusBadge({ status }) {
  const [label, style] = statuses[status] || ["Unknown", "badge-slate"];
  return (
    <span className={`badge ${style}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  if (!priority || priority === "medium") return null;
  return <span className={`priority priority-${priority}`}>{priority}</span>;
}

export function ReportCard({ report }) {
  const date = new Date(report.created_at);
  return (
    <Link to={`/reports/${report.id}`} className="report-card group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="category-label">
              {report.category_name || report.category.replaceAll("_", " ")}
            </span>
            <PriorityBadge priority={report.priority} />
          </div>
          <h3 className="line-clamp-2 text-base font-bold text-ink group-hover:text-leaf">
            {report.title}
          </h3>
        </div>
        <ArrowRight
          size={18}
          className="mt-1 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-leaf"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} />
          {report.neighborhood}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 size={13} />
          {Number.isNaN(date.getTime())
            ? "Recently"
            : date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={13} />
          {Number(report.confirmations || 0)} confirmations
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={report.status} />
        <span className="text-[11px] text-muted">
          #{String(report.id).padStart(4, "0")}
        </span>
      </div>
    </Link>
  );
}

export function Loading({ label = "Loading" }) {
  return (
    <div className="state-card">
      <LoaderCircle size={23} className="animate-spin text-leaf" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="state-card state-error">
      <AlertCircle size={21} />
      <div className="flex-1">
        <p className="font-semibold">Couldn’t load this right now</p>
        <p className="mt-1 text-sm opacity-80">{message}</p>
      </div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  text = "When there is an update, it will show up here.",
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <CheckCircle2 size={23} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function InlineMessage({ type = "error", children }) {
  return (
    <div
      className={`inline-message ${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {type === "success" ? (
        <CheckCircle2 size={17} />
      ) : (
        <AlertCircle size={17} />
      )}
      {children}
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}
