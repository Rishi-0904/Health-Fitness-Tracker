import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../state/AuthContext.jsx";

const navItems = [
  { path: "/", label: "Dashboard", exact: true },
  { path: "/metrics", label: "Daily Metrics" },
  { path: "/workouts", label: "Workouts" },
  { path: "/meals", label: "Meals" },
  { path: "/sleep", label: "Sleep" },
  { path: "/wearables", label: "Wearables" }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <h1>FitTrack</h1>
          <p>Stay on top of your health</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `nav-link${isActive ? " nav-link-active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="header-title">
            <h2>Hello, {user?.displayName ?? "Athlete"}</h2>
            <span className="header-subtitle">Track. Improve. Thrive.</span>
          </div>
          <div className="header-actions">
            <span className="header-email">{user?.email}</span>
            <button className="button button-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
