import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Shell from "./components/Shell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import NewReport from "./pages/NewReport";
import ReportDetail from "./pages/ReportDetail";
import Login from "./pages/Login";
import {
  AdminCategoriesWorkspace,
  AdminStaffWorkspace,
  AdminWorkspace,
  StaffWorkspace,
} from "./pages/Workspaces";
import { Loading } from "./components/Shared";
import "leaflet/dist/leaflet.css";
import "./index.css";

function LoginGate() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready)
    return (
      <div className="page-loading">
        <Loading label="Getting your account ready…" />
      </div>
    );
  if (user)
    return (
      <Navigate
        to={
          user.role === "staff"
            ? "/staff"
            : ["admin", "super_admin"].includes(user.role)
              ? "/admin"
              : "/"
        }
        replace
      />
    );
  return <Login />;
}

function ReportSubmission() {
  const { user } = useAuth();
  return user?.role === "staff" ? (
    <Navigate to="/staff" replace />
  ) : (
    <NewReport />
  );
}

function Protected({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready)
    return (
      <div className="page-loading">
        <Loading label="Checking your access…" />
      </div>
    );
  if (!user)
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  if (!roles.includes(user.role))
    return (
      <Navigate
        to={
          user.role === "staff"
            ? "/staff"
            : ["admin", "super_admin"].includes(user.role)
              ? "/admin"
              : "/"
        }
        replace
      />
    );
  return children;
}

function NotFound() {
  return (
    <div className="not-found">
      <span>404</span>
      <h1>Looks like this path needs fixing.</h1>
      <p>The page may have moved or never existed.</p>
      <a href="/" className="btn btn-primary">
        Back to the overview
      </a>
    </div>
  );
}

function App() {
  const { ready } = useAuth();
  if (!ready)
    return (
      <div className="page-loading">
        <Loading label="Starting FixNearMe…" />
      </div>
    );
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="reports" element={<Explore />} />
        <Route path="reports/:id" element={<ReportDetail />} />
        <Route path="report/new" element={<ReportSubmission />} />
        <Route
          path="admin"
          element={
            <Protected roles={["admin", "super_admin"]}>
              <AdminWorkspace />
            </Protected>
          }
        />
        <Route
          path="admin/categories"
          element={
            <Protected roles={["admin", "super_admin"]}>
              <AdminCategoriesWorkspace />
            </Protected>
          }
        />
        <Route
          path="admin/staff"
          element={
            <Protected roles={["admin", "super_admin"]}>
              <AdminStaffWorkspace />
            </Protected>
          }
        />
        <Route
          path="staff"
          element={
            <Protected roles={["staff"]}>
              <StaffWorkspace />
            </Protected>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/login" element={<LoginGate />} />
      <Route
        path="/register"
        element={<Navigate to="/login?mode=register" replace />}
      />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
