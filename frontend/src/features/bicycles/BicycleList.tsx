import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/apiClient";
import "../../styles/student.css";

type BicycleStatus = "available" | "in_use" | "maintenance" | "missing";
type Bicycle = { id: string; code: string; name: string; status: BicycleStatus; qr_code?: string };
type Result = { items: Bicycle[]; message?: string };
type Filter = "all" | BicycleStatus;

const demoBicycles: Bicycle[] = [
  { id: "demo-1", code: "UR-001", name: "Campus Cruiser 01", status: "available", qr_code: "QR-UR-001" },
  { id: "demo-2", code: "UR-002", name: "Campus Cruiser 02", status: "in_use", qr_code: "QR-UR-002" },
  { id: "demo-3", code: "UR-003", name: "Campus Cruiser 03", status: "maintenance", qr_code: "QR-UR-003" },
  { id: "demo-4", code: "UR-004", name: "Campus Cruiser 04", status: "available", qr_code: "QR-UR-004" },
];

const labelForStatus = (status: BicycleStatus) => ({
  available: "Available", in_use: "In use", maintenance: "Maintenance", missing: "Missing",
}[status]);

export function BicycleList() {
  const [items, setItems] = useState<Bicycle[]>([]);
  const [message, setMessage] = useState("Loading bicycles…");
  const [isDemo, setIsDemo] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;
    setMessage("Loading bicycles…");
    apiRequest<Result>("/bicycles")
      .then(result => {
        if (!active) return;
        const fetched = result.items ?? [];
        setItems(fetched);
        setIsDemo(false);
        setMessage(result.message ?? (fetched.length ? "" : "No bicycles have been added yet."));
      })
      .catch(() => {
        if (!active) return;
        setItems(demoBicycles);
        setIsDemo(true);
        setMessage("Backend unavailable. Showing sample bicycles for the UI demonstration.");
      });
    return () => { active = false; };
  }, [refresh]);

  const counts = useMemo(() => ({
    total: items.length,
    available: items.filter(item => item.status === "available").length,
    inUse: items.filter(item => item.status === "in_use").length,
    maintenance: items.filter(item => item.status === "maintenance" || item.status === "missing").length,
  }), [items]);

  const visibleItems = useMemo(() => items.filter(item => {
    const matchesSearch = `${item.code} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (filter === "all" || item.status === filter);
  }), [items, search, filter]);

  return (
    <section id="bicycles" className="section student-section">
      <div className="section-heading">
        <div><div className="eyebrow">THE FLEET</div><h2>Find your ride.</h2><p className="muted">Check bicycle availability before heading out.</p></div>
        <button type="button" className="button button-quiet" onClick={() => setRefresh(value => value + 1)}>Refresh fleet</button>
      </div>

      <div className="student-stats" aria-label="Bicycle summary">
        <article><span>Total bicycles</span><strong>{counts.total}</strong></article>
        <article><span>Available now</span><strong>{counts.available}</strong></article>
        <article><span>Currently in use</span><strong>{counts.inUse}</strong></article>
        <article><span>Needs attention</span><strong>{counts.maintenance}</strong></article>
      </div>

      {message && <p className={isDemo ? "notice" : "muted"} role="status">{message}</p>}
      <div className="bike-toolbar">
        <label className="bike-search">Search bicycles
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by ID or name…" />
        </label>
        <label className="bike-filter">Availability
          <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
            <option value="all">All statuses</option><option value="available">Available</option>
            <option value="in_use">In use</option><option value="maintenance">Maintenance</option><option value="missing">Missing</option>
          </select>
        </label>
      </div>

      {visibleItems.length ? <div className="bike-grid">{visibleItems.map(bike => (
        <article className="bike-card" key={bike.id}>
          <div className="bike-illustration" aria-hidden="true">🚲</div>
          <div className="bike-meta"><span className={`status status-${bike.status}`}>{labelForStatus(bike.status)}</span><span className="muted">{bike.code}</span></div>
          <h3>{bike.name}</h3>
          <p className="muted">{bike.status === "available" ? "Ready for your next campus trip." : bike.status === "in_use" ? "This bicycle is currently being used." : "This bicycle is not available for rides."}</p>
          {bike.status === "available" && <a className="button button-quiet bike-use-link" href="#rides">Use this bicycle</a>}
        </article>
      ))}</div> : <div className="empty-state"><strong>No bicycles match your search.</strong><p className="muted">Try a different ID or status filter.</p><button className="button button-quiet" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button></div>}
      {isDemo && <p className="tiny muted">Sample values are for demonstration only; they are not live inventory records.</p>}
    </section>
  );
}
