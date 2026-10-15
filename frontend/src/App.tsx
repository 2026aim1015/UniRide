import { useState } from "react";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { ReportPage } from "./features/reports/ReportPage";
import "./App.css";

function App() {
  const [page, setPage] = useState<"dashboard" | "reports">("dashboard");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>UniRide</h1>
          <p>Campus Bicycle Sharing System</p>
        </div>

        <nav>
          <button
            className={page === "dashboard" ? "nav-button active" : "nav-button"}
            onClick={() => setPage("dashboard")}
          >
            Admin Dashboard
          </button>

          <button
            className={page === "reports" ? "nav-button active" : "nav-button"}
            onClick={() => setPage("reports")}
          >
            Report an Issue
          </button>
        </nav>
      </header>

      <main className="app-main">
        {page === "dashboard" ? <AdminDashboard /> : <ReportPage />}
      </main>

      <footer className="app-footer">
        UniRide · Smart Campus Bicycle Sharing
      </footer>
    </div>
  );
}

export default App;