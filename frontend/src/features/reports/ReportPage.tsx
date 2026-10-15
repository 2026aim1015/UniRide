import { useState, type FormEvent } from "react";
import { apiRequest } from "../../lib/apiClient";
import "../../styles/admin.css";

type SubmittedReport = { id: number; bicycleCode: string; category: string; description: string; status: string };

const categoryLabels: Record<string, string> = {
  damage: "Damage", missing: "Missing bicycle", safety: "Safety issue", other: "Other",
};

export function ReportPage() {
  const [bike, setBike] = useState("");
  const [category, setCategory] = useState("damage");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedReport[]>([]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError(false);
    setBusy(true);
    try {
      const result = await apiRequest<{ message?: string }>("/reports", {
        method: "POST",
        body: JSON.stringify({ bicycle_code: bike.trim() || null, category, description: description.trim() }),
      });
      setSubmitted(current => [{
        id: Date.now(), bicycleCode: bike.trim() || "Not specified",
        category: categoryLabels[category] ?? category, description: description.trim(), status: "Submitted",
      }, ...current]);
      setMessage(result.message ?? "Report submitted successfully.");
      setBike("");
      setCategory("damage");
      setDescription("");
    } catch (requestError) {
      setError(true);
      setMessage(requestError instanceof Error ? requestError.message : "Could not submit report. Check that the backend is running.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reports" className="panel report-panel">
      <div className="eyebrow">HELP KEEP BIKES SAFE</div><h2>Report an issue</h2>
      <p className="muted">Tell the UniRide team if a bicycle is damaged, missing or unsafe.</p>
      <form className="form" onSubmit={submit}>
        <label>Bicycle code (optional)<input value={bike} onChange={event => setBike(event.target.value)} placeholder="e.g. UR-001" /></label>
        <label>Issue type<select value={category} onChange={event => setCategory(event.target.value)}><option value="damage">Damage</option><option value="missing">Missing bicycle</option><option value="safety">Safety issue</option><option value="other">Other</option></select></label>
        <label>What happened?<textarea required minLength={5} maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the issue…" rows={3} /></label>
        <div className="report-form-footer"><span className="tiny muted">{description.length}/1000 characters</span><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Submitting…" : "Submit report"}</button></div>
      </form>
      {message && <p className={error ? "error" : "notice"} role="status">{message}</p>}
      {submitted.length > 0 && <div className="submitted-reports"><div className="admin-subheading"><div><div className="eyebrow">THIS SESSION</div><h3>Reports submitted</h3></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Bicycle</th><th>Issue</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>{submitted.map(report => <tr key={report.id}><td>{report.bicycleCode}</td><td>{report.category}</td><td>{report.description}</td><td><span className="status status-available">{report.status}</span></td></tr>)}</tbody>
        </table></div>
        <p className="tiny muted">This list reflects successful submissions in the current browser session; reload to clear it. Persistent report history requires a backend list endpoint.</p>
      </div>}
    </section>
  );
}
