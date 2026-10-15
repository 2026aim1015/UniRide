import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/apiClient";
import "../../styles/admin.css";

type SummaryResponse = { message?: string; note?: string; total_bicycles?: number; available_bicycles?: number; active_rides?: number; pending_reports?: number };
type AdminBike = { code: string; name: string; status: string; maintenance: string };

const demoBikes: AdminBike[] = [
  { code: "UR-001", name: "Campus Cruiser 01", status: "available", maintenance: "Good" },
  { code: "UR-002", name: "Campus Cruiser 02", status: "in_use", maintenance: "Good" },
  { code: "UR-003", name: "Campus Cruiser 03", status: "maintenance", maintenance: "Inspection" },
  { code: "UR-004", name: "Campus Cruiser 04", status: "available", maintenance: "Good" },
];

export function AdminDashboard() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [message, setMessage] = useState("Loading admin summary…");
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<SummaryResponse>("/admin/summary")
      .then(data => {
        if (!active) return;
        setSummary(data);
        setMessage(data.message ?? "Admin summary loaded.");
        setDemo(false);
      })
      .catch(() => {
        if (!active) return;
        setSummary(null);
        setDemo(true);
        setMessage("Backend summary unavailable. The table and figures below are sample data for UI demonstration.");
      });
    return () => { active = false; };
  }, []);

  const bikes = demo ? demoBikes : [];
  const metrics = [
    { label: "Total bicycles", value: summary?.total_bicycles ?? (demo ? 4 : "—") },
    { label: "Available", value: summary?.available_bicycles ?? (demo ? 2 : "—") },
    { label: "Active rides", value: summary?.active_rides ?? (demo ? 1 : "—") },
    { label: "Pending reports", value: summary?.pending_reports ?? (demo ? 2 : "—") },
  ];

  return (
    <section id="admin" className="panel admin-panel">
      <div className="eyebrow">OPERATIONS</div><h2>Admin dashboard</h2>
      <p className={demo ? "notice" : "muted"} role="status">{message}{summary?.note ? ` ${summary.note}` : ""}</p>
      <div className="admin-cards admin-metrics">{metrics.map(metric => (
        <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></article>
      ))}</div>

      <div className="admin-subheading"><div><div className="eyebrow">FLEET MANAGEMENT</div><h3>Bicycle inventory</h3></div><span className="tiny muted">{demo ? "Sample data" : "Live backend summary"}</span></div>
      {bikes.length ? <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Bicycle ID</th><th>Name</th><th>Status</th><th>Maintenance</th></tr></thead>
        <tbody>{bikes.map(bike => <tr key={bike.code}><td>{bike.code}</td><td>{bike.name}</td><td><span className={`status status-${bike.status}`}>{bike.status.replace("_", " ")}</span></td><td>{bike.maintenance}</td></tr>)}</tbody>
      </table></div> : <p className="muted">The backend currently provides summary information only. Connect a bicycle inventory endpoint to populate this table with live records.</p>}
      <div className="admin-next-steps"><strong>Admin responsibilities</strong><ul><li>Review reported bicycle issues.</li><li>Keep availability and maintenance states up to date.</li><li>Check active rides and investigate overdue returns.</li></ul></div>
      <p className="tiny muted">Frontend role checks are for navigation only. The FastAPI backend must enforce all admin permissions.</p>
    </section>
  );
}
