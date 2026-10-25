import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { InlineMessage } from "../components/Shared";

export default function Login() {
  const [params] = useSearchParams();
  const [registering, setRegistering] = useState(
    params.get("mode") === "register",
  );
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { signIn, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = params.get("returnTo") || location.state?.from || "/";
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = registering
        ? await register(form.name, form.email, form.password)
        : await signIn(form.email, form.password);
      navigate(
        returnTo === "/reports"
          ? "/reports"
          : user.role === "staff"
            ? "/staff"
            : ["admin", "super_admin"].includes(user.role)
              ? "/admin"
              : returnTo,
        { replace: true },
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back to FixNearMe
      </Link>
      <div className="auth-card">
        <div className="auth-mark">
          <Leaf size={22} fill="currentColor" />
        </div>
        <p className="eyebrow">
          {registering ? "JOIN YOUR COMMUNITY" : "WELCOME BACK"}
        </p>
        <h1>
          {registering ? "Let’s make things better." : "Good to see you again."}
        </h1>
        <p className="auth-copy">
          {registering
            ? "Create a resident account to confirm reports and follow local progress."
            : "Sign in to check on your reports and stay part of the conversation."}
        </p>
        {error && <InlineMessage>{error}</InlineMessage>}
        <form onSubmit={submit} className="auth-form">
          {registering && (
            <label className="field">
              Full name
              <input
                autoComplete="name"
                required
                minLength="2"
                maxLength="120"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
              />
            </label>
          )}
          <label className="field">
            Email address
            <div className="input-icon">
              <Mail size={17} />
              <input
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
          </label>
          <label className="field">
            Password
            <div className="input-icon">
              <LockKeyhole size={17} />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={registering ? "new-password" : "current-password"}
                minLength={registering ? 4 : 1}
                maxLength="128"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={
                  registering ? "At least 4 characters" : "Your password"
                }
              />
              <button
                className="show-password"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {registering && (
              <small className="field-hint">Use at least 4 characters.</small>
            )}
          </label>
          <button className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? (
              "One moment…"
            ) : (
              <>
                {registering ? "Create resident account" : "Sign in"}{" "}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
        <p className="auth-switch">
          {registering ? "Already have an account?" : "New to FixNearMe?"}{" "}
          <button
            onClick={() => {
              setRegistering(!registering);
              setError("");
            }}
          >
            {registering ? "Sign in" : "Create an account"}
          </button>
        </p>
        <div className="auth-trust">
          <ShieldCheck size={15} /> Account access is protected and role-based.
        </div>
      </div>
      <div className="auth-side">
        <div className="auth-side-glow" />
        <span className="auth-side-kicker">VISIBLE PROGRESS STARTS HERE</span>
        <h2>
          Better neighborhoods
          <br />
          are built <i>together.</i>
        </h2>
        <div className="auth-side-quote">
          <span>“</span>
          <p>
            Every time someone speaks up, our whole neighborhood gets a little
            stronger.
          </p>
          <small>THE FIXNEARME COMMUNITY</small>
        </div>
        <div className="auth-side-bottom">
          <UserRound size={15} /> Residents · Local staff · Shared progress
        </div>
      </div>
    </div>
  );
}
