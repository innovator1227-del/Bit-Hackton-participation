import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  ClipboardList,
  ImagePlus,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { api, mediaUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  EmptyState,
  ErrorState,
  InlineMessage,
  Loading,
  PageHeading,
  PriorityBadge,
  StatusBadge,
} from "../components/Shared";
import { PriorityScore } from "../components/PriorityBrief";

const reportStatuses = [
  ["reported", "Reported"],
  ["under_review", "Under review"],
  ["in_progress", "In progress"],
  ["pending_verification", "Pending verification"],
  ["resolved", "Resolved"],
  ["rejected", "Closed"],
];
const priorities = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["urgent", "Urgent"],
];

function DashboardCharts({ reports, categories }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    return {
      date,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      count: reports.filter((report) => {
        const created = new Date(report.created_at);
        return created >= date && created < next;
      }).length,
    };
  });
  const maxDaily = Math.max(...days.map((day) => day.count), 1);
  const points = days.map((day, index) => ({
    x: 36 + index * 76,
    y: 132 - (day.count / maxDaily) * 100,
    ...day,
  }));
  const line = points
    .map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`)
    .join(" ");
  const area = `${line} L ${points.at(-1).x} 142 L ${points[0].x} 142 Z`;
  const categoryCounts = categories
    .map((category) => ({
      ...category,
      count: reports.filter((report) => report.category === category.slug)
        .length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const maxCategory = Math.max(
    ...categoryCounts.map((category) => category.count),
    1,
  );

  return (
    <section className="dashboard-charts" aria-label="Report analytics">
      <article className="dashboard-chart-card trend-chart">
        <div className="chart-card-heading">
          <div>
            <span className="chart-icon">
              <Activity size={16} />
            </span>
            <div>
              <p className="eyebrow">REPORT ACTIVITY</p>
              <h2>New reports</h2>
            </div>
          </div>
          <span className="chart-period">Last 7 days</span>
        </div>
        <div className="chart-total">
          <strong>{days.reduce((sum, day) => sum + day.count, 0)}</strong>
          <span>reports submitted</span>
        </div>
        <svg
          className="trend-svg"
          viewBox="0 0 528 176"
          role="img"
          aria-label={`New reports over the last seven days: ${days.map((day) => `${day.label} ${day.count}`).join(", ")}`}
        >
          <defs>
            <linearGradient id="reportTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8fbd98" stopOpacity=".38" />
              <stop offset="100%" stopColor="#e9f3ea" stopOpacity=".12" />
            </linearGradient>
          </defs>
          {[32, 82, 132].map((y) => (
            <line
              key={y}
              x1="34"
              x2="526"
              y1={y}
              y2={y}
              className="chart-grid-line"
            />
          ))}
          <path d={area} className="trend-area" />
          <path d={line} className="trend-line" />
          {points.map((point) => (
            <g key={point.label + point.date.toISOString()}>
              <circle cx={point.x} cy={point.y} r="4" className="trend-dot" />
              <text
                x={point.x}
                y="164"
                textAnchor="middle"
                className="chart-axis-label"
              >
                {point.label}
              </text>
              <text
                x={point.x}
                y={point.y - 11}
                textAnchor="middle"
                className="chart-value-label"
              >
                {point.count}
              </text>
            </g>
          ))}
        </svg>
      </article>
      <article className="dashboard-chart-card category-chart">
        <div className="chart-card-heading">
          <div>
            <span className="chart-icon">
              <ClipboardList size={16} />
            </span>
            <div>
              <p className="eyebrow">WHERE HELP IS NEEDED</p>
              <h2>Reports by category</h2>
            </div>
          </div>
          <span className="chart-period">{reports.length} total</span>
        </div>
        {categoryCounts.length ? (
          <div className="category-bars">
            {categoryCounts.slice(0, 7).map((category, index) => (
              <div className="category-bar-row" key={category.slug}>
                <div className="category-bar-label">
                  <span>{category.name}</span>
                  <b>{category.count}</b>
                </div>
                <div className="category-bar-track">
                  <span
                    className={`category-bar-fill category-color-${index % 6}`}
                    style={{
                      width: `${category.count ? Math.max(4, (category.count / maxCategory) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="chart-empty">
            Add categories to see the report breakdown.
          </div>
        )}
        <p className="chart-footnote">Includes open and completed reports.</p>
      </article>
    </section>
  );
}

function ResolutionReview({ report, onReviewed }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (report.status !== "pending_verification") return null;
  async function decide(decision) {
    setError("");
    if (decision === "request_changes" && note.trim().length < 3) {
      setError("Explain what needs more work.");
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/reports/${report.id}/review-resolution`, {
        method: "PATCH",
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      });
      onReviewed();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="resolution-review">
      <a
        href={mediaUrl(report.resolution_image_url)}
        target="_blank"
        rel="noreferrer"
        className="resolution-photo-link"
      >
        <img
          src={mediaUrl(report.resolution_image_url)}
          alt={`Completion evidence for ${report.title}`}
        />
        <span>View completion photo</span>
      </a>
      <textarea
        aria-label={`Review note for ${report.title}`}
        rows="2"
        maxLength="1000"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Required if requesting more work"
      />
      <div className="resolution-review-actions">
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => decide("approve")}
        >
          {busy ? "Saving…" : "Approve"}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={() => decide("request_changes")}
        >
          Request more work
        </button>
      </div>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

function AdminRow({ report, staff, canAssign, onSaved }) {
  const [status, setStatus] = useState(report.status);
  const [priority, setPriority] = useState(report.priority);
  const [assigned, setAssigned] = useState(
    report.assigned_to ? String(report.assigned_to) : "",
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setStatus(report.status);
    setPriority(report.priority);
    setAssigned(report.assigned_to ? String(report.assigned_to) : "");
    setNote("");
  }, [report.status, report.priority, report.assigned_to]);
  async function save() {
    setError("");
    setSaved(false);
    if (status === "rejected" && !note.trim()) {
      setError("Add a reason before closing this report.");
      return;
    }
    if (status === "resolved" && report.status !== "resolved") {
      setError("Approve the completion photo using the review controls.");
      return;
    }
    if (
      report.status === "pending_verification" &&
      status !== "pending_verification"
    ) {
      setError(
        "Use the review controls to approve the photo or request more work.",
      );
      return;
    }
    const body = { status, priority, note: note.trim() || undefined };
    if (
      canAssign &&
      (assigned || null) !==
        (report.assigned_to ? String(report.assigned_to) : null)
    )
      body.assigned_to = assigned ? Number(assigned) : null;
    setBusy(true);
    try {
      await api(`/admin/reports/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setSaved(true);
      setNote("");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const dirty =
    status !== report.status ||
    priority !== report.priority ||
    (assigned || null) !==
      (report.assigned_to ? String(report.assigned_to) : null) ||
    Boolean(note.trim());
  const categoryStaff = staff.filter(
    (member) => member.is_active && member.category === report.category,
  );
  const currentStaffMismatch =
    report.assigned_to &&
    !categoryStaff.some(
      (member) => String(member.id) === String(report.assigned_to),
    );
  const leadingReason = report.priority_brief?.reasons?.find(
    (reason) => !reason.label.includes("selected priority"),
  );
  return (
    <tr>
      <td>
        <Link className="admin-report-title" to={`/reports/${report.id}`}>
          <b>{report.title}</b>
          <small>
            #{String(report.id).padStart(4, "0")} · {report.neighborhood}
          </small>
        </Link>
        {report.image_url ? (
          <a
            className="admin-report-photo"
            href={mediaUrl(report.image_url)}
            target="_blank"
            rel="noreferrer"
            aria-label={`View submitted photo for ${report.title}`}
          >
            <img
              src={mediaUrl(report.image_url)}
              alt={`Submitted photo for ${report.title}`}
              loading="lazy"
            />
            <span>
              <ImagePlus size={12} />
              View submitted photo
            </span>
          </a>
        ) : (
          <small className="admin-no-photo">No photo attached</small>
        )}
      </td>
      <td>
        <StatusBadge status={report.status} />
        <ResolutionReview report={report} onReviewed={onSaved} />
      </td>
      <td className="civic-signal-cell">
        <PriorityScore brief={report.priority_brief} />
        {leadingReason && <small>{leadingReason.label}</small>}
      </td>
      <td>
        <span className="category-label">
          {report.category_name || report.category.replaceAll("_", " ")}
        </span>
      </td>
      <td>
        {canAssign ? (
          <>
            <select
              className="table-select"
              aria-label={`Assign ${report.title}`}
              value={assigned}
              onChange={(e) => setAssigned(e.target.value)}
            >
              <option value="">Unassigned</option>
              {currentStaffMismatch && (
                <option value={String(report.assigned_to)}>
                  {report.assigned_to_name} · reassign
                </option>
              )}
              {categoryStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {!categoryStaff.length && (
                <option value="__none" disabled>
                  No staff for this category
                </option>
              )}
            </select>
            <small className="staff-category-hint">
              {categoryStaff.length} active{" "}
              {categoryStaff.length === 1 ? "staff member" : "staff members"}{" "}
              for {report.category_name || report.category.replaceAll("_", " ")}
            </small>
          </>
        ) : (
          <span className="text-sm">
            {report.assigned_to_name || (
              <i className="text-muted">Unassigned</i>
            )}
          </span>
        )}
      </td>
      <td>
        <select
          className="table-select"
          aria-label={`Priority for ${report.title}`}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {priorities.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="table-select"
          aria-label={`Status for ${report.title}`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {reportStatuses.map(([v, l]) => (
            <option
              key={v}
              value={v}
              disabled={
                (v === "pending_verification" && report.status !== v) ||
                (v === "resolved" && report.status !== v)
              }
            >
              {l}
            </option>
          ))}
        </select>
        <input
          className="table-note"
          aria-label={`Update note for ${report.title}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            status === "rejected" ? "Reason required" : "Optional update note"
          }
        />
        {error && <small className="field-error">{error}</small>}
        {saved && (
          <small className="saved-inline">
            <Check size={12} /> Saved
          </small>
        )}
      </td>
      <td>
        <button
          className="btn btn-primary btn-sm"
          disabled={busy || !dirty}
          onClick={save}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}

function StaffManager({ reloadKey, onChange, categories, canDeactivate }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    category: "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await api("/admin/staff");
      setStaff(response.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [reloadKey]);
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api("/admin/staff", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "", category: "" });
      setNotice({
        type: "success",
        text: "Staff account created. Share the initial password securely.",
      });
      onChange();
      await load();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }
  async function toggle(member) {
    setNotice(null);
    try {
      await api(`/admin/staff/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      await load();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    }
  }
  return (
    <section className="staff-manager">
      <div className="staff-manager-head">
        <div>
          <p className="eyebrow">PEOPLE POWERING THE FIX</p>
          <h2>Staff accounts</h2>
          <p>Each staff account is linked to one report category.</p>
        </div>
        <span className="staff-count">
          <UsersRound size={15} />
          {staff.length} team members
        </span>
      </div>
      {notice && (
        <InlineMessage type={notice.type}>{notice.text}</InlineMessage>
      )}
      <div className="staff-manager-grid">
        <div className="staff-list">
          {loading ? (
            <Loading label="Loading staff…" />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : staff.length ? (
            staff.map((member) => (
              <div className="staff-member" key={member.id}>
                <span className="staff-avatar">
                  {member.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="staff-member-info">
                  <b>{member.name}</b>
                  <small>{member.email}</small>
                  <span className="staff-workload">
                    {member.category_name || "No category"} ·{" "}
                    {Number(member.assigned_reports || 0)} assigned ·{" "}
                    {Number(member.active_reports || 0)} in progress
                  </span>
                </div>
                {canDeactivate ? (
                  <button
                    onClick={() => toggle(member)}
                    className={`staff-active ${member.is_active ? "is-active" : ""}`}
                  >
                    {member.is_active ? "Active" : "Paused"}
                  </button>
                ) : (
                  <span
                    className={`staff-active ${member.is_active ? "is-active" : ""}`}
                  >
                    {member.is_active ? "Active" : "Paused"}
                  </span>
                )}
              </div>
            ))
          ) : (
            <EmptyState
              title="No staff accounts"
              text="Create an account for the people who will resolve reported problems."
            />
          )}
        </div>
        <form className="create-staff" onSubmit={create}>
          <span className="create-staff-icon">
            <Plus size={17} />
          </span>
          <h3>Add a staff member</h3>
          <p>Staff can be assigned reports from this category.</p>
          <label className="field">
            Full name
            <input
              required
              minLength="2"
              maxLength="120"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Staff member name"
            />
          </label>
          <label className="field">
            Email address
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
            />
          </label>
          <label className="field">
            Report category
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Choose a category</option>
              {categories
                .filter((category) => category.is_active)
                .map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Initial password
            <input
              type="password"
              required
              minLength="12"
              maxLength="128"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 12 characters"
            />
            <small className="field-hint">
              Share it privately. Password changes and resets are not available
              in this first version.
            </small>
          </label>
          <button
            className="btn btn-primary w-full"
            disabled={
              busy || !categories.some((category) => category.is_active)
            }
          >
            {busy ? (
              "Creating account…"
            ) : (
              <>
                Create staff account <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

function CategoryRow({ category, onSaved }) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/admin/categories/${encodeURIComponent(category.slug)}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      });
      setNotice("Saved");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggleActive() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (category.is_active)
        await api(`/admin/categories/${encodeURIComponent(category.slug)}`, {
          method: "DELETE",
        });
      else
        await api(`/admin/categories/${encodeURIComponent(category.slug)}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: true }),
        });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const dirty =
    name.trim() !== category.name ||
    description !== (category.description || "");
  return (
    <div className="category-admin-row">
      <div className="category-admin-fields">
        <label className="field">
          Category name
          <input
            maxLength="80"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          Description
          <input
            maxLength="255"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What kinds of problems fit here?"
          />
        </label>
        <small className="category-slug">
          Key: {category.slug} · {Number(category.report_count || 0)} reports ·{" "}
          {Number(category.staff_count || 0)} staff
        </small>
      </div>
      <div className="category-admin-actions">
        <span
          className={`staff-active ${category.is_active ? "is-active" : ""}`}
        >
          {category.is_active ? "Active" : "Archived"}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          disabled={busy || !dirty}
          onClick={save}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={toggleActive}
        >
          {category.is_active ? "Archive" : "Restore"}
        </button>
      </div>
      {error && (
        <small className="field-error category-row-error">{error}</small>
      )}
      {notice && (
        <small className="saved-inline category-row-error">
          <Check size={12} />
          {notice}
        </small>
      )}
    </div>
  );
}

function CategoryManager({ reloadKey, onChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api("/admin/categories");
      setCategories(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [reloadKey]);
  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api("/admin/categories", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ name: "", description: "" });
      setNotice({ type: "success", text: "Category created." });
      onChange();
      await load();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="category-manager">
      <div className="staff-manager-head">
        <div>
          <p className="eyebrow">REPORT CLASSIFICATION</p>
          <h2>Report categories</h2>
          <p>
            Active categories appear in report forms and staff setup. Archiving
            keeps existing report history.
          </p>
        </div>
        <span className="staff-count">
          {categories.filter((category) => category.is_active).length} active
        </span>
      </div>
      {notice && (
        <InlineMessage type={notice.type}>{notice.text}</InlineMessage>
      )}
      <div className="category-manager-grid">
        <div className="category-admin-list">
          {loading ? (
            <Loading label="Loading categories…" />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : (
            categories.map((category) => (
              <CategoryRow
                key={category.slug}
                category={category}
                onSaved={() => {
                  onChange();
                  load();
                }}
              />
            ))
          )}
          {!loading && !error && !categories.length && (
            <EmptyState
              title="No categories"
              text="Create a report category to start classifying issues."
            />
          )}
        </div>
        <form className="create-staff category-create" onSubmit={create}>
          <span className="create-staff-icon">
            <Plus size={17} />
          </span>
          <h3>Add a category</h3>
          <p>A short name will generate a stable key for saved reports.</p>
          <label className="field">
            Category name
            <input
              required
              minLength="2"
              maxLength="80"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Public parks"
            />
          </label>
          <label className="field">
            Description <span className="optional">OPTIONAL</span>
            <textarea
              rows="3"
              maxLength="255"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="What problems belong in this category?"
            />
          </label>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? (
              "Creating…"
            ) : (
              <>
                Create category <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export function AdminWorkspace() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const isSuper = user?.role === "super_admin";
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r, s, c] = await Promise.all([
        api("/admin/reports"),
        api("/admin/staff"),
        api("/admin/categories"),
      ]);
      setReports(r.data);
      setStaff(s.data);
      setCategories(c.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [reloadKey, isSuper]);
  const active = reports.filter(
    (r) => !["resolved", "rejected"].includes(r.status),
  );
  const visible = (
    filter === "all"
      ? reports
      : filter === "open"
        ? active
        : filter === "high_signal"
          ? active.filter((r) => r.priority_brief?.score >= 50)
          : reports.filter((r) => r.status === filter)
  )
    .slice()
    .sort(
      (a, b) => (b.priority_brief?.score || 0) - (a.priority_brief?.score || 0),
    );
  const metrics = [
    { label: "Total reports", value: reports.length, icon: ClipboardList },
    { label: "Need attention", value: active.length, icon: CircleAlert },
    {
      label: "High civic signal",
      value: active.filter((r) => r.priority_brief?.score >= 50).length,
      icon: Activity,
    },
    {
      label: "Unassigned",
      value: active.filter((r) => !r.assigned_to).length,
      icon: BriefcaseBusiness,
    },
    {
      label: "Resolved",
      value: reports.filter((r) => r.status === "resolved").length,
      icon: BadgeCheck,
    },
  ];
  return (
    <div className="content-page workspace-page">
      <PageHeading
        eyebrow={isSuper ? "SUPER ADMIN WORKSPACE" : "ADMIN WORKSPACE"}
        title="Keep good work moving."
        description={
          isSuper
            ? "Review community reports, coordinate your staff, and make sure every issue has an owner."
            : "Review community reports and keep each update clear and accountable."
        }
        action={
          <span className="workspace-role">
            <ShieldCheck size={15} />
            {isSuper ? "Super admin" : "Administrator"}
          </span>
        }
      />
      {loading ? (
        <Loading label="Gathering community activity…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="metric-grid admin-metrics">
            {metrics.map(({ label, value, icon: Icon }) => (
              <div className="metric-card" key={label}>
                <span className="metric-icon">
                  <Icon size={18} />
                </span>
                <span className="metric-number">{value}</span>
                <span className="metric-label">{label}</span>
              </div>
            ))}
          </div>
          <DashboardCharts reports={reports} categories={categories} />
          <section className="admin-table-section">
            <div className="admin-table-heading">
              <div>
                <p className="eyebrow">THE COMMUNITY QUEUE</p>
                <h2>Reports that need a response</h2>
                <p>Reports are ranked by their explainable civic signal.</p>
              </div>
              <label className="admin-filter">
                Show
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All reports</option>
                  <option value="high_signal">High civic signal</option>
                  <option value="open">Open reports</option>
                  <option value="reported">Reported</option>
                  <option value="under_review">Under review</option>
                  <option value="in_progress">In progress</option>
                  <option value="pending_verification">
                    Pending verification
                  </option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Closed</option>
                </select>
              </label>
            </div>
            {visible.length ? (
              <div className="table-overflow">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>Current status</th>
                      <th>Civic signal</th>
                      <th>Category</th>
                      <th>{isSuper ? "Assign staff" : "Assigned staff"}</th>
                      <th>Priority</th>
                      <th>Update status / note</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <AdminRow
                        key={r.id}
                        report={r}
                        staff={staff}
                        canAssign={isSuper}
                        onSaved={() => setReloadKey((n) => n + 1)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No reports in this view"
                text="Try another filter or check back when a new issue is reported."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function AdminCategoriesWorkspace() {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";
  return (
    <div className="content-page workspace-page">
      <PageHeading
        eyebrow="ADMIN WORKSPACE"
        title="Report categories"
        description="Create and maintain the categories residents use to classify local problems."
        action={
          <span className="workspace-role">
            <ShieldCheck size={15} />
            {isSuper ? "Super admin" : "Administrator"}
          </span>
        }
      />
      <CategoryManager reloadKey={0} onChange={() => {}} />
    </div>
  );
}

export function AdminStaffWorkspace() {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function loadCategories() {
    setLoading(true);
    setError("");
    try {
      const response = await api("/admin/categories");
      setCategories(response.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadCategories();
  }, []);
  return (
    <div className="content-page workspace-page">
      <PageHeading
        eyebrow="ADMIN WORKSPACE"
        title="Staff management"
        description="Create category-specialized staff accounts and review their current workloads."
        action={
          <span className="workspace-role">
            <ShieldCheck size={15} />
            {isSuper ? "Super admin" : "Administrator"}
          </span>
        }
      />
      {loading ? (
        <Loading label="Loading active staff categories…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCategories} />
      ) : (
        <StaffManager
          reloadKey={0}
          onChange={() => {}}
          categories={categories}
          canDeactivate={isSuper}
        />
      )}
    </div>
  );
}

export function StaffWorkspace() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});
  const [proofs, setProofs] = useState({});
  const [proofErrors, setProofErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await api("/reports/staff/assigned");
      setReports(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function chooseProof(reportId, file) {
    setProofErrors((old) => ({ ...old, [reportId]: "" }));
    if (!file) {
      setProofs((old) => ({ ...old, [reportId]: null }));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProofs((old) => ({ ...old, [reportId]: null }));
      setProofErrors((old) => ({
        ...old,
        [reportId]: "Choose a JPEG, PNG, or WebP photo.",
      }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofs((old) => ({ ...old, [reportId]: null }));
      setProofErrors((old) => ({
        ...old,
        [reportId]: "The photo must be 5 MB or smaller.",
      }));
      return;
    }
    setProofs((old) => ({ ...old, [reportId]: file }));
  }
  async function update(report, status) {
    setBusy(report.id);
    setNotice(null);
    setProofErrors((old) => ({ ...old, [report.id]: "" }));
    if (status === "resolved" && !proofs[report.id]) {
      setProofErrors((old) => ({
        ...old,
        [report.id]: "Add a completion photo before requesting approval.",
      }));
      setBusy(null);
      return;
    }
    try {
      let body;
      if (status === "resolved") {
        body = new FormData();
        body.append("status", status);
        body.append("image", proofs[report.id]);
        if (notes[report.id]?.trim())
          body.append("note", notes[report.id].trim());
      } else
        body = JSON.stringify({
          status,
          note: notes[report.id]?.trim() || undefined,
        });
      await api(`/reports/staff/reports/${report.id}`, {
        method: "PATCH",
        body,
      });
      setNotice({
        type: "success",
        text:
          status === "resolved"
            ? `Completion photo sent to an admin for approval.`
            : `“${report.title}” updated.`,
      });
      setNotes((old) => ({ ...old, [report.id]: "" }));
      setProofs((old) => ({ ...old, [report.id]: null }));
      await load();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(null);
    }
  }
  const pending = reports.filter(
    (r) => r.status === "pending_verification",
  ).length;
  return (
    <div className="content-page workspace-page">
      <PageHeading
        eyebrow="YOUR WORK QUEUE"
        title="The next good fix starts here."
        description="You can only view and update reports assigned to your staff account. Upload a completion photo to request resolution."
        action={
          <span className="workspace-role">
            <BriefcaseBusiness size={15} /> Staff view
          </span>
        }
      />
      <div className="metric-grid staff-metrics">
        <div className="metric-card">
          <span className="metric-icon">
            <ClipboardList size={18} />
          </span>
          <span className="metric-number">{reports.length}</span>
          <span className="metric-label">Assigned to you</span>
        </div>
        <div className="metric-card">
          <span className="metric-icon">
            <CircleAlert size={18} />
          </span>
          <span className="metric-number">
            {reports.filter((r) => r.status === "in_progress").length}
          </span>
          <span className="metric-label">In progress</span>
        </div>
        <div className="metric-card">
          <span className="metric-icon">
            <ImagePlus size={18} />
          </span>
          <span className="metric-number">{pending}</span>
          <span className="metric-label">Awaiting review</span>
        </div>
        <div className="metric-card">
          <span className="metric-icon">
            <BadgeCheck size={18} />
          </span>
          <span className="metric-number">
            {reports.filter((r) => r.status === "resolved").length}
          </span>
          <span className="metric-label">Approved fixes</span>
        </div>
      </div>
      <section className="staff-work-section">
        <div className="admin-table-heading">
          <div>
            <p className="eyebrow">YOUR ASSIGNED REPORTS</p>
            <h2>Work on the block</h2>
            <p>Urgent and older reports are shown first.</p>
          </div>
        </div>
        {notice && (
          <InlineMessage type={notice.type}>{notice.text}</InlineMessage>
        )}
        {loading ? (
          <Loading label="Loading your assignments…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : reports.length ? (
          <div className="staff-work-list">
            {reports.map((r) => (
              <article className="staff-work-card" key={r.id}>
                <div className="staff-work-main">
                  <div className="detail-topline">
                    <span className="category-label">
                      {r.category_name || r.category.replaceAll("_", " ")}
                    </span>
                    <PriorityBadge priority={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>
                  <Link to={`/reports/${r.id}`} className="staff-work-title">
                    {r.title}
                    <ArrowRight size={16} />
                  </Link>
                  <p>{r.description}</p>
                  <div className="detail-meta">
                    <span>
                      {r.neighborhood}
                      {r.landmark ? ` · ${r.landmark}` : ""}
                    </span>
                    <span>#{String(r.id).padStart(4, "0")}</span>
                  </div>
                </div>
                {r.status === "pending_verification" ? (
                  <div className="staff-awaiting-review">
                    <ImagePlus size={17} />
                    <span>
                      Your completion photo is waiting for admin approval.
                    </span>
                  </div>
                ) : (
                  !["resolved", "rejected"].includes(r.status) && (
                    <div className="staff-work-actions">
                      <label className="field">
                        Update note <span className="optional">OPTIONAL</span>
                        <textarea
                          rows="2"
                          maxLength="1000"
                          value={notes[r.id] || ""}
                          onChange={(e) =>
                            setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                          }
                          placeholder="What did you do? What happens next?"
                        />
                      </label>
                      <label className="field completion-photo-field">
                        Completion photo{" "}
                        <span className="required">
                          REQUIRED TO REQUEST RESOLUTION
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) =>
                            chooseProof(r.id, e.target.files?.[0])
                          }
                        />
                        <small className="field-hint">
                          JPEG, PNG, or WebP · up to 5 MB
                          {proofs[r.id]
                            ? ` · Selected: ${proofs[r.id].name}`
                            : ""}
                        </small>
                        {proofErrors[r.id] && (
                          <small className="field-error">
                            {proofErrors[r.id]}
                          </small>
                        )}
                      </label>
                      <div className="staff-button-row">
                        {r.status !== "in_progress" && (
                          <button
                            className="btn btn-secondary"
                            disabled={busy === r.id}
                            onClick={() => update(r, "in_progress")}
                          >
                            Mark in progress
                          </button>
                        )}
                        <button
                          className="btn btn-primary"
                          disabled={busy === r.id}
                          onClick={() => update(r, "resolved")}
                        >
                          {busy === r.id ? (
                            "Submitting…"
                          ) : (
                            <>
                              <Check size={15} /> Submit for approval
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No reports assigned yet"
            text="Reports assigned to you will appear here."
          />
        )}
      </section>
    </div>
  );
}
