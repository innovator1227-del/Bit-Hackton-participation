import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronDown,
  CircleUserRound,
  Leaf,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Shell() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const navigate = useNavigate();
  const links = [
    { to: "/", label: "Overview", end: true },
    { to: "/reports", label: "Explore reports" },
    ...(user?.role === "staff"
      ? [{ to: "/staff", label: "My assignments" }]
      : []),
    ...(["admin", "super_admin"].includes(user?.role)
      ? [
          { to: "/admin", label: "Admin", end: true },
          { to: "/admin/categories", label: "Categories" },
          { to: "/admin/staff", label: "Staff" },
        ]
      : []),
  ];
  function logout() {
    signOut();
    setMobileOpen(false);
    setUserOpen(false);
    navigate("/");
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Leaf size={18} fill="currentColor" />
            </span>
            <span>
              fixnear<span className="brand-light">me</span>
              <small>NEIGHBORHOOD ACTION</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="top-actions">
            {user?.role !== "staff" && (
              <Link to="/report/new" className="btn btn-primary nav-cta">
                <Plus size={16} strokeWidth={2.5} />
                Report an issue
              </Link>
            )}
            {["admin", "super_admin", "staff"].includes(user?.role) && (
              <NotificationBell />
            )}
            {user ? (
              <div className="user-menu">
                <button
                  className="user-chip"
                  onClick={() => setUserOpen(!userOpen)}
                  aria-expanded={userOpen}
                >
                  <span className="avatar">
                    {user.name?.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="user-chip-copy">
                    <b>{user.name?.split(" ")[0]}</b>
                    <small>{user.role.replace("_", " ")}</small>
                  </span>
                  <ChevronDown size={15} />
                </button>
                {userOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-person">
                      <b>{user.name}</b>
                      <span>{user.email}</span>
                    </div>
                    <button onClick={logout}>
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="login-link">
                Sign in <ArrowUpRight size={15} />
              </Link>
            )}
            <button
              className="mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="mobile-nav">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            {user?.role !== "staff" && (
              <Link to="/report/new" onClick={() => setMobileOpen(false)}>
                <Plus size={16} /> Report an issue
              </Link>
            )}
            {user ? (
              <button onClick={logout}>
                <LogOut size={16} /> Sign out
              </button>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <CircleUserRound size={16} /> Sign in
              </Link>
            )}
          </div>
        )}
      </header>
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-leaf">
              <Leaf size={16} />
            </span>
            <b>FixNearMe</b>
            <span>Small fixes. Stronger neighborhoods.</span>
          </div>
          <div className="footer-right">
            <span>
              <ShieldCheck size={14} /> Community-powered · Locally focused
            </span>
            <span>© 2026 FixNearMe</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
