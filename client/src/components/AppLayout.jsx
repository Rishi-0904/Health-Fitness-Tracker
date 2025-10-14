import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../state/AuthContext.jsx";

const navItems = [
  { path: "/", label: "Dashboard", icon: "🏠", exact: true },
  { path: "/metrics", label: "Daily Metrics", icon: "📈" },
  { path: "/workouts", label: "Workouts", icon: "💪" },
  { path: "/meals", label: "Meals", icon: "🍽️" },
  { path: "/sleep", label: "Sleep", icon: "🌙" },
  { path: "/goals", label: "Goals", icon: "🎯" },
  { path: "/wearables", label: "Wearables", icon: "⌚" }
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
              <span className="nav-link-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-link-label">{item.label}</span>
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
            <div className="header-badge">
              <span className="header-email">{user?.email}</span>
            </div>
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
