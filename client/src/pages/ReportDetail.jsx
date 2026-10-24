import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api, mediaUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  EmptyState,
  ErrorState,
  InlineMessage,
  Loading,
  PriorityBadge,
  ReportCard,
  StatusBadge,
} from "../components/Shared";
import PriorityBrief from "../components/PriorityBrief";

export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r, history] = await Promise.all([
        api(`/reports/${id}`),
        api(`/reports/${id}/updates`),
      ]);
      setReport(r.data);
      setUpdates(history.data);
      if (r.data.status !== "resolved" && r.data.status !== "rejected") {
        const similar = await api("/reports/check-duplicates", {
          method: "POST",
          body: JSON.stringify(r.data),
        }).catch(() => ({ data: [] }));
        setMatches(
          similar.data
            .map((item) => item.report)
            .filter((item) => String(item.id) !== String(id))
            .slice(0, 2),
        );
      } else setMatches([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  async function confirm() {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/reports/${id}/confirm`, { method: "POST" });
      setMessage({
        type: "success",
        text: "Thanks for confirming this report. Your support helps the team see what matters.",
      });
      await load();
    } catch (e) {
      setMessage({
        type: "error",
        text:
          e.status === 409
            ? "You’ve already confirmed this report."
            : e.message,
      });
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="content-page">
        <Loading label="Opening report…" />
      </div>
    );
  if (error)
    return (
      <div className="content-page">
        <ErrorState message={error} onRetry={load} />
        <Link className="back-link" to="/reports">
          <ArrowLeft size={15} /> Back to reports
        </Link>
      </div>
    );
  const date = new Date(report.created_at);
  return (
    <div className="content-page detail-page">
      <Link className="back-link" to="/reports">
        <ArrowLeft size={15} /> All reports
      </Link>
      <div className="detail-layout">
        <article className="detail-main">
          <div className="detail-topline">
            <span className="category-label">
              {report.category_name || report.category.replaceAll("_", " ")}
            </span>
            <PriorityBadge priority={report.priority} />
            <StatusBadge status={report.status} />
          </div>
          <h1 className="detail-title">{report.title}</h1>
          <div className="detail-meta">
            <span>
              <MapPin size={15} />
              {report.neighborhood}
              {report.landmark ? ` · ${report.landmark}` : ""}
            </span>
            <span>
              <Clock3 size={15} />
              Reported{" "}
              {date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span>#{String(report.id).padStart(4, "0")}</span>
          </div>
          {report.image_url && (
            <figure className="report-photo">
              <img
                src={mediaUrl(report.image_url)}
                alt={`Photo showing: ${report.title}`}
                loading="lazy"
              />
              <figcaption>Photo submitted with this report</figcaption>
            </figure>
          )}
          {report.resolution_image_url && (
            <figure className="report-photo resolution-photo">
              <img
                src={mediaUrl(report.resolution_image_url)}
                alt={`Approved repair completion for: ${report.title}`}
                loading="lazy"
              />
              <figcaption>
                {report.status === "resolved"
                  ? "Completion photo approved by an admin"
                  : "Completion photo submitted for admin review"}
              </figcaption>
            </figure>
          )}
          <div className="detail-description">{report.description}</div>
          <PriorityBrief brief={report.priority_brief} />
          {user?.role !== "staff" && (
            <div className="detail-confirm">
              <div className="confirm-symbol">
                <MessageCircle size={20} />
              </div>
              <div>
                <b>Know this needs attention too?</b>
                <p>
                  Confirming helps your neighbors and local team understand the
                  impact.
                </p>
              </div>
              {user ? (
                <button
                  className="btn btn-primary"
                  disabled={
                    busy || ["resolved", "rejected"].includes(report.status)
                  }
                  onClick={confirm}
                >
                  {busy ? (
                    "Confirming…"
                  ) : (
                    <>
                      <Check size={16} /> I see this too ·{" "}
                      {report.confirmations || 0}
                    </>
                  )}
                </button>
              ) : (
                <Link className="btn btn-primary" to="/login?returnTo=/reports">
                  Sign in to confirm
                </Link>
              )}
            </div>
          )}
          {message && (
            <div className="mt-3">
              <InlineMessage type={message.type}>{message.text}</InlineMessage>
            </div>
          )}
          {matches.length > 0 && (
            <section className="similar-section">
              <div className="subsection-title">
                <div>
                  <p className="eyebrow">SOMETHING SIMILAR?</p>
                  <h2>Related reports nearby</h2>
                </div>
                <span>Suggestions only</span>
              </div>
              <div className="report-grid">
                {matches.map((item) => (
                  <ReportCard key={item.id} report={item} />
                ))}
              </div>
            </section>
          )}
        </article>
        <aside className="detail-aside">
          <section className="side-card">
            <p className="eyebrow">PROGRESS SO FAR</p>
            <h2>Report timeline</h2>
            {updates.length ? (
              <ol className="timeline">
                {updates.map((item, i) => (
                  <li key={item.id} className="timeline-item">
                    <span
                      className={`timeline-marker ${i === updates.length - 1 ? "latest" : ""}`}
                    />
                    {i < updates.length - 1 && (
                      <span className="timeline-line" />
                    )}
                    <div>
                      <b>
                        {item.new_status
                          ? item.new_status.replaceAll("_", " ")
                          : "Report updated"}
                      </b>
                      <time>
                        {new Date(item.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                      {item.note && <p>{item.note}</p>}
                      {item.image_url && (
                        <figure className="timeline-proof">
                          <img
                            src={mediaUrl(item.image_url)}
                            alt="Staff completion proof"
                            loading="lazy"
                          />
                          <figcaption>
                            {item.new_status === "resolved"
                              ? "Admin-approved completion photo"
                              : "Completion photo submitted for review"}
                          </figcaption>
                        </figure>
                      )}
                      {item.updated_by && (
                        <small>
                          <UserRound size={12} /> {item.updated_by}
                        </small>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="Just getting started"
                text="Updates will appear here as the report moves forward."
              />
            )}
          </section>
          <section className="side-note">
            <ShieldCheck size={19} />
            <div>
              <b>Every update is accountable</b>
              <p>
                Changes are recorded so neighbors can follow progress clearly.
              </p>
            </div>
          </section>
        </aside>
      </div>
      {user?.role !== "staff" && (
        <div className="detail-footer-cta">
          <div>
            <b>Know another issue that needs attention?</b>
            <span>Every report helps create a clearer picture.</span>
          </div>
          <Link className="text-link" to="/report/new">
            Share a report <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
