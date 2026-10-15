import { useState, type FormEvent } from "react";
import { apiRequest } from "../../lib/apiClient";

export function RidePage() {
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const result = await apiRequest<{ message?: string }>("/rides/start", {
        method: "POST",
        body: JSON.stringify({ bicycle_code: code.trim(), qr_code: qr.trim() }),
      });
      setMessage(result.message ?? "Ride request submitted. Follow any instructions shown by the campus team.");
    } catch (requestError) {
      setError(true);
      setMessage(requestError instanceof Error ? requestError.message : "Ride request failed. Check that the backend is running.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="rides" className="panel ride-panel">
      <div className="eyebrow">YOUR NEXT JOURNEY</div><h2>Start a ride</h2>
      <p className="muted">Enter the bicycle code and QR value printed on the bicycle. Camera scanning is not available yet.</p>
      <form className="form form-inline" onSubmit={start}>
        <label>Bicycle code<input required value={code} onChange={event => setCode(event.target.value)} placeholder="e.g. UR-001" /></label>
        <label>QR value<input required value={qr} onChange={event => setQr(event.target.value)} placeholder="Code printed on bike" /></label>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Checking…" : "Start ride"}</button>
      </form>
      {message && <p className={error ? "error ride-feedback" : "notice ride-feedback"} role="status">{message}</p>}
      <p className="tiny muted">A ride starts only if the backend confirms the request. This form does not simulate a successful ride.</p>
    </section>
  );
}
