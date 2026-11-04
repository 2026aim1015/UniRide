import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bike, Check, Copy, Pencil, Plus, RefreshCw, Search, X } from 'lucide-react'
import { adminApi, errorMessage, type AdminBicycle, type AdminZone } from '../../services/adminApi'

type FormState = { display_name: string; status: string; current_zone_id: string }
const emptyForm: FormState = { display_name: '', status: 'available', current_zone_id: '' }

const statusLabel: Record<string, string> = {
  available: 'Available', in_use: 'In use', reserved: 'Reserved',
  maintenance: 'Maintenance', offline: 'Offline',
}

export default function BicyclesPage() {
  const [bicycles, setBicycles] = useState<AdminBicycle[]>([])
  const [zones, setZones] = useState<AdminZone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AdminBicycle | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [bikeRows, zoneRows] = await Promise.all([adminApi.bicycles(), adminApi.zones()])
      setBicycles(bikeRows); setZones(zoneRows)
    } catch (e) { setError(errorMessage(e, 'Could not load bicycles.')) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return bicycles
    return bicycles.filter(b =>
      `${b.qr_code_id} ${b.display_name} ${b.status} ${b.id}`.toLowerCase().includes(q),
    )
  }, [bicycles, search])

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setShowForm(true); setError(''); setNotice('')
  }
  const openEdit = (bike: AdminBicycle) => {
    setEditing(bike)
    setForm({ display_name: bike.display_name, status: bike.status, current_zone_id: bike.current_zone_id ?? '' })
    setShowForm(true); setError(''); setNotice('')
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm) }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      const payload = {
        display_name: form.display_name.trim(),
        status: form.status,
        current_zone_id: form.current_zone_id || null,
      }
      if (!payload.display_name) throw new Error('Enter a bicycle name.')
      if (editing) {
        await adminApi.updateBicycle(editing.id, payload)
        setNotice('Bicycle details updated.')
      } else {
        const created = await adminApi.createBicycle(payload)
        setNotice(`Bicycle added. Its permanent ID is ${created.qr_code_id}.`)
      }
      closeForm()
      await load()
    } catch (e) { setError(errorMessage(e, 'Could not save bicycle.')) }
    finally { setSaving(false) }
  }

  const copyId = async (id: string) => {
    try { await navigator.clipboard.writeText(id); setNotice(`Copied ${id}.`) }
    catch { setNotice(`Bicycle ID: ${id} (select and copy it manually).`) }
  }

  return (
    <section className="content-stack">
      <div className="section-heading">
        <div><h2>Bicycle management</h2><p>Add bicycles and manage their permanent IDs, parking zones, and availability.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button button-ghost" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Refresh</button>
          <button className="button button-primary" type="button" onClick={openCreate}><Plus size={16}/> Add bicycle</button>
        </div>
      </div>

      <div className="stats-grid">
        {[
          ['Total bicycles', bicycles.length],
          ['Available', bicycles.filter(b => b.status === 'available').length],
          ['In use', bicycles.filter(b => b.status === 'in_use' || b.status === 'reserved').length],
          ['Needs attention', bicycles.filter(b => b.status === 'maintenance' || b.status === 'offline').length],
        ].map(([label, value]) => <div className="stat-card" key={String(label)}><div className="stat-top">{label}</div><div className="stat-value">{value}</div></div>)}
      </div>

      {error && <div className="panel" role="alert" style={{ color: '#b42318' }}>{error}</div>}
      {notice && <div className="panel" role="status" style={{ color: '#18794e' }}>{notice}</div>}

      {showForm && <form className="panel content-stack" onSubmit={save}>
        <div className="panel-heading">
          <div><h3>{editing ? 'Edit bicycle' : 'Add a bicycle'}</h3><p>{editing ? 'The permanent bicycle ID cannot be changed.' : 'A permanent bicycle ID will be generated automatically.'}</p></div>
          <button className="icon-button" type="button" onClick={closeForm} aria-label="Close"><X size={18}/></button>
        </div>
        <label>Bicycle name
          <input required maxLength={160} value={form.display_name} onChange={e => setForm(v => ({ ...v, display_name: e.target.value }))} placeholder="UniRide Bicycle 01"/>
        </label>
        {editing && <label>Permanent bicycle ID
          <input value={editing.qr_code_id} readOnly/>
        </label>}
        <label>Status
          <select value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value }))}>
            <option value="available">Available</option>
            <option value="in_use" disabled={!editing || editing.status === 'in_use'}>In use (managed by ride flow)</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>
        </label>
        <label>Parking zone
          <select value={form.current_zone_id} onChange={e => setForm(v => ({ ...v, current_zone_id: e.target.value }))}>
            <option value="">No zone assigned</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create bicycle'}</button>
          <button className="button button-ghost" type="button" onClick={closeForm} disabled={saving}>Cancel</button>
        </div>
      </form>}

      <section className="panel">
        <div className="panel-heading"><div><h3>Campus bicycles</h3><p>{bicycles.length} registered bicycles · IDs are unique and permanent</p></div></div>
        <label className="search-field" style={{ margin: '0 0 16px', maxWidth: 520 }}><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by bicycle ID or name…"/></label>
        {loading ? <p>Loading bicycles…</p> : filtered.length === 0 ? <div style={{ padding: 24, textAlign: 'center' }}><Bike size={30}/><p>No bicycles match this search.</p></div> :
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Bicycle / permanent ID', 'Parking zone', 'Status', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid var(--border, #e3e7e2)' }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(b => <tr key={b.id}>
              <td style={{ padding: 12 }}><strong>{b.display_name}</strong><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><code>{b.qr_code_id}</code><button className="icon-button" type="button" title="Copy bicycle ID" onClick={() => void copyId(b.qr_code_id)}><Copy size={14}/></button></div></td>
              <td style={{ padding: 12 }}>{zones.find(z => z.id === b.current_zone_id)?.name ?? 'Not assigned'}</td>
              <td style={{ padding: 12 }}><span className={`status-chip ${b.status === 'available' ? 'available' : b.status === 'maintenance' || b.status === 'offline' ? 'maintenance' : 'in-use'}`}>{statusLabel[b.status] ?? b.status}</span></td>
              <td style={{ padding: 12 }}><button className="button button-ghost" type="button" onClick={() => openEdit(b)}><Pencil size={14}/> Edit</button></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <div className="panel"><strong>QR-code handoff</strong><p>For each bicycle, your QR generator should encode the exact permanent ID shown above (for example, <code>UR-BIKE-A1B2C3D4</code>). Do not encode the database UUID or bicycle name. The website's manual search and QR scanner both identify bicycles using this same code.</p></div>
    </section>
  )
}
