import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Filter,
  LayoutGrid,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { api } from "../services/api";
import {
  EmptyState,
  ErrorState,
  Loading,
  PageHeading,
  ReportCard,
} from "../components/Shared";
import ReportMap, { statusColors, statusLabels } from "../components/ReportMap";
import { useAuth } from "../context/AuthContext";

const statuses = [
  ["", "All statuses"],
  ["reported", "Reported"],
  ["under_review", "Under review"],
  ["in_progress", "In progress"],
  ["pending_verification", "Pending verification"],
  ["resolved", "Resolved"],
  ["rejected", "Closed"],
];

export default function Explore() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [search, setSearch] = useState(params.get("search") || "");
  const [filters, setFilters] = useState({
    category: params.get("category") || "",
    status: params.get("status") || "",
    priority: params.get("priority") || "",
    neighborhood: params.get("neighborhood") || "",
  });
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("list");
  async function load(nextPage = 1, override = null, requestedView = viewMode) {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      page: nextPage,
      limit: requestedView === "map" ? 100 : 9,
    });
    const effectiveSearch = override ? override.search : search.trim();
    const effectiveFilters = override ? override.filters : filters;
    if (effectiveSearch) query.set("search", effectiveSearch);
    Object.entries(effectiveFilters).forEach(
      ([key, value]) => value && query.set(key, value),
    );
    try {
      const result = await api(`/reports?${query}`);
      setData(result.data);
      setPagination(result.pagination);
      setPage(nextPage);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(1);
    api("/categories")
      .then((result) => setCategories(result.data))
      .catch((e) => setCategoryError(e.message));
  }, []);
  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (search.trim()) next.set("search", search.trim());
    Object.entries(filters).forEach(([k, v]) => v && next.set(k, v));
    setParams(next);
    load(1);
  }
  function changeFilter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  function clear() {
    const empty = { category: "", status: "", priority: "", neighborhood: "" };
    setSearch("");
    setFilters(empty);
    setParams({});
    load(1, { search: "", filters: empty });
  }
  function switchView(mode) {
    setViewMode(mode);
    load(1, null, mode);
  }
  const mappedCount = data.filter(
    (report) => report.latitude != null && report.longitude != null,
  ).length;
  const hasFilter = Boolean(search || Object.values(filters).some(Boolean));
  return (
    <div className="content-page">
      <PageHeading
        eyebrow="COMMUNITY ACTIVITY"
        title="Explore reports"
        description="See what your neighbors are reporting and follow the work as it gets done."
        action={
          user?.role !== "staff" && (
            <Link to="/report/new" className="btn btn-primary">
              <span>+</span> New report
            </Link>
          )
        }
      />
      <form className="filter-panel" onSubmit={submit}>
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search reports"
            placeholder="Search reports, places, or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary search-submit">
            Search
          </button>
        </label>
        <div className="filters-row">
          <span className="filter-label">
            <SlidersHorizontal size={14} /> FILTER BY
          </span>
          <select
            aria-label="Category"
            value={filters.category}
            onChange={(e) => changeFilter("category", e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option value={category.slug} key={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Status"
            value={filters.status}
            onChange={(e) => changeFilter("status", e.target.value)}
          >
            {statuses.map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Priority"
            value={filters.priority}
            onChange={(e) => changeFilter("priority", e.target.value)}
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input
            aria-label="Neighborhood"
            className="neighborhood-filter"
            placeholder="Neighborhood"
            value={filters.neighborhood}
            onChange={(e) => changeFilter("neighborhood", e.target.value)}
          />
          <button className="btn btn-secondary filter-apply" type="submit">
            <Filter size={15} /> Apply
          </button>
          {hasFilter && (
            <button className="clear-filter" type="button" onClick={clear}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </form>
      {categoryError && (
        <p className="field-error mt-2" role="status">
          Category filters are unavailable: {categoryError}
        </p>
      )}
      <div className="results-bar">
        <span>
          {pagination ? (
            <>
              <b>{pagination.total}</b> reports in the community
            </>
          ) : (
            "Community reports"
          )}
        </span>
        <div className="view-switch" role="group" aria-label="Report view">
          <button
            type="button"
            className={viewMode === "list" ? "is-selected" : ""}
            aria-pressed={viewMode === "list"}
            onClick={() => switchView("list")}
          >
            <LayoutGrid size={14} /> List
          </button>
          <button
            type="button"
            className={viewMode === "map" ? "is-selected" : ""}
            aria-pressed={viewMode === "map"}
            onClick={() => switchView("map")}
          >
            <MapIcon size={14} /> Map
          </button>
        </div>
      </div>
      {loading ? (
        <Loading label="Looking through community reports…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(page)} />
      ) : data.length ? (
        <>
          {viewMode === "map" ? (
            <>
              <div className="map-view-caption">
                Showing {mappedCount} mapped{" "}
                {mappedCount === 1 ? "report" : "reports"}
                {pagination?.total > data.length
                  ? ` · latest ${data.length} of ${pagination.total}`
                  : ""}
                {data.length > mappedCount
                  ? ` · ${data.length - mappedCount} without a location`
                  : ""}
              </div>
              <ReportMap reports={data} className="explore-map" />
              {!mappedCount && (
                <p className="map-empty-note">
                  No reports in this view include a map location yet. Try
                  another filter or view.
                </p>
              )}
              <div className="map-legend" aria-label="Map marker legend">
                {Object.entries(statusLabels).map(([status, label]) => (
                  <span key={status}>
                    <i style={{ background: statusColors[status] }} />
                    {label}
                  </span>
                ))}
                <span>
                  <i className="urgent-legend-dot" />
                  Urgent
                </span>
              </div>
            </>
          ) : (
            <div className="report-grid">
              {data.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
          {pagination?.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => load(page - 1)}
              >
                Previous
              </button>
              <span>
                Page <b>{page}</b> of {pagination.pages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= pagination.pages}
                onClick={() => load(page + 1)}
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title={
            hasFilter
              ? "No reports match those filters"
              : "Nothing reported yet"
          }
          text={
            hasFilter
              ? "Try broadening your search or clearing a filter."
              : "Be the first to share something that needs attention."
          }
        />
      )}
    </div>
  );
}
