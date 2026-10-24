import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  HardHat,
  HeartHandshake,
  MapPin,
  Plus,
  Radio,
  Sparkles,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  EmptyState,
  ErrorState,
  Loading,
  ReportCard,
} from "../components/Shared";

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [statsResponse, reportsResponse] = await Promise.all([
        api("/dashboard/stats"),
        api("/reports?limit=3"),
      ]);
      setStats(statsResponse.data);
      setReports(reportsResponse.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const open = stats
    ? Number(stats.total) -
      Number(stats.by_status?.resolved || 0) -
      Number(stats.by_status?.rejected || 0)
    : 0;
  return (
    <>
      <section className="hero">
        <div className="hero-grain" />
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="live-dot" />
            YOUR NEIGHBORHOOD, IN MOTION
          </div>
          <h1>
            Good places don’t
            <br />
            happen <em>by accident.</em>
          </h1>
          <p className="hero-copy">
            See something that needs attention? Bring it to the people who can
            help — and follow every fix along the way.
          </p>
          <div className="hero-actions">
            {user?.role !== "staff" && (
              <Link to="/report/new" className="btn btn-light">
                <Plus size={17} /> Report a problem
              </Link>
            )}
            <Link to="/reports" className="hero-secondary">
              Explore reports <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span>
              <MapPin size={14} /> Built around your community
            </span>
            <span className="hero-foot-divider" />
            <span>Local issues. Visible progress.</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="art-hill hill-back" />
          <div className="art-hill hill-front" />
          <div className="art-building building-one">
            <span />
            <span />
          </div>
          <div className="art-building building-two">
            <span />
            <span />
            <span />
          </div>
          <div className="art-building building-three">
            <span />
            <span />
          </div>
          <div className="art-road" />
          <div className="art-pin pin-one">
            <MapPin size={18} fill="currentColor" />
          </div>
          <div className="art-pin pin-two">
            <MapPin size={16} fill="currentColor" />
          </div>
          <div className="art-fix-card">
            <span className="fix-icon">
              <HardHat size={17} />
            </span>
            <span>
              <b>Streetlight fixed</b>
              <small>Today · Bole</small>
            </span>
            <span className="fix-check">✓</span>
          </div>
          <div className="art-note">
            A little better,
            <br />
            <i>every day.</i>
          </div>
        </div>
      </section>

      <section className="impact-strip">
        <div className="impact-lead">
          <span className="impact-icon">
            <Radio size={17} />
          </span>
          <span>
            <b>Here’s what’s happening</b>
            <small>Real reports from your community</small>
          </span>
        </div>
        {loading ? (
          <div className="impact-loading">Updating community pulse…</div>
        ) : error ? (
          <button className="impact-retry" onClick={load}>
            Live counts unavailable · Retry
          </button>
        ) : (
          <div className="impact-stats">
            <div>
              <b>{stats?.total || 0}</b>
              <span>total reports</span>
            </div>
            <div>
              <b>{open}</b>
              <span>being addressed</span>
            </div>
            <div>
              <b>{stats?.by_status?.resolved || 0}</b>
              <span>resolved</span>
            </div>
          </div>
        )}
        <Link to="/reports" className="impact-link">
          See all activity <ArrowUpRight size={15} />
        </Link>
      </section>

      <section className="home-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">YOUR NEIGHBORS ARE ON IT</p>
            <h2>Fresh from the community</h2>
            <p className="section-subtitle">
              Every report is a small act of looking out for each other.
            </p>
          </div>
          <Link to="/reports" className="text-link">
            View all reports <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <Loading label="Fetching the latest reports…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : reports?.length ? (
          <div className="report-grid">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Be the first to speak up"
            text="Share something that needs attention in your neighborhood."
          />
        )}
      </section>

      <section className="how-section">
        <div>
          <p className="eyebrow">A BETTER BLOCK STARTS HERE</p>
          <h2>
            Small steps.
            <br />
            <span>Visible progress.</span>
          </h2>
          <p className="section-subtitle">
            FixNearMe brings community members and local teams together around
            the things that make daily life better.
          </p>
          {user?.role !== "staff" && (
            <Link className="text-link" to="/report/new">
              Bring something to light <ArrowRight size={15} />
            </Link>
          )}
        </div>
        <div className="steps-list">
          <div className="step-row">
            <span className="step-number">01</span>
            <span className="step-icon">
              <MapPin size={19} />
            </span>
            <div>
              <b>Spot it</b>
              <p>Report a local issue with a few helpful details.</p>
            </div>
            <ArrowDownRight className="step-arrow" size={18} />
          </div>
          <div className="step-row">
            <span className="step-number">02</span>
            <span className="step-icon">
              <HeartHandshake size={19} />
            </span>
            <div>
              <b>We’re in it together</b>
              <p>Neighbors can confirm issues and help raise visibility.</p>
            </div>
            <ArrowDownRight className="step-arrow" size={18} />
          </div>
          <div className="step-row">
            <span className="step-number">03</span>
            <span className="step-icon">
              <Sparkles size={19} />
            </span>
            <div>
              <b>Watch progress</b>
              <p>Follow updates from first report to resolution.</p>
            </div>
            <Clock3 size={18} className="step-arrow last" />
          </div>
        </div>
      </section>
      {user?.role !== "staff" && (
        <section className="bottom-cta">
          <div>
            <p className="eyebrow">ONE NEIGHBORHOOD AT A TIME</p>
            <h2>
              What could be better
              <br />
              right outside your door?
            </h2>
          </div>
          <Link to="/report/new" className="btn btn-primary">
            Let’s make it better <ArrowRight size={16} />
          </Link>
        </section>
      )}
    </>
  );
}
