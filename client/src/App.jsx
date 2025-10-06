import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./state/AuthContext.jsx";
import { AppLayout } from "./components/AppLayout.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { MetricsPage } from "./pages/MetricsPage.jsx";
import { WorkoutsPage } from "./pages/WorkoutsPage.jsx";
import { MealsPage } from "./pages/MealsPage.jsx";
import { SleepPage } from "./pages/SleepPage.jsx";
import { WearablesPage } from "./pages/WearablesPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="metrics" element={<MetricsPage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="sleep" element={<SleepPage />} />
        <Route path="wearables" element={<WearablesPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
