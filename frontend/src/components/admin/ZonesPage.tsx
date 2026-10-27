import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { MapPin, Pencil, Plus, RefreshCw, ToggleLeft, ToggleRight, X } from 'lucide-react'

type ParkingZone = {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
}

type ZoneForm = {
  name: string
  latitude: string
  longitude: string
  radius_meters: string
  is_active: boolean
}

const emptyForm: ZoneForm = {
  name: '',
  latitude: '',
  longitude: '',
  radius_meters: '30',
  is_active: true,
}

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/parking-zones`

export default function ZonesPage() {
  const [zones, setZones] = useState<ParkingZone[]>([])
  const [form, setForm] = useState<ZoneForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)

  const request = useCallback(async (path = '', init?: RequestInit) => {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    const token = data.session?.access_token
    if (!token) throw new Error('Your session has expired. Please sign in again.')

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.detail || `Request failed (${response.status})`)
    }
    if (response.status === 204) return null
    return response.json()
  }, [])

  const loadZones = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Admins request inactive zones too, so they can reactivate them.
      const result = await request('?include_inactive=true')
      setZones(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load parking zones.')
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => { void loadZones() }, [loadZones])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const beginEdit = (zone: ParkingZone) => {
    setForm({
      name: zone.name,
      latitude: String(zone.latitude),
      longitude: String(zone.longitude),
      radius_meters: String(zone.radius_meters),
      is_active: zone.is_active,
    })
    setEditingId(zone.id)
    setShowForm(true)
    setError('')
    setNotice('')
  }

  const saveZone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')

    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)
    const radius = Number(form.radius_meters)
    if (!form.name.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isInteger(radius) || radius < 1 || radius > 10000) {
      setError('Enter a zone name, valid coordinates, and a whole-number radius from 1 to 10,000 metres.')
      return
    }

    const payload = {
      name: form.name.trim(),
      latitude,
      longitude,
      radius_meters: radius,
      is_active: form.is_active,
    }
    setSaving(true)
    try {
      if (editingId) {
        await request(`/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setNotice('Parking zone updated successfully.')
      } else {
        await request('', { method: 'POST', body: JSON.stringify(payload) })
        setNotice('Parking zone created successfully.')
      }
      resetForm()
      await loadZones()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save parking zone.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (zone: ParkingZone) => {
    setError('')
    setNotice('')
    try {
      await request(`/${encodeURIComponent(zone.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !zone.is_active }),
      })
      setNotice(`${zone.name} ${zone.is_active ? 'deactivated' : 'activated'}.`)
      await loadZones()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update zone status.')
    }
  }

  return (
    <section className="content-stack zones-page">
      <div className="section-heading">
        <div>
          <h2>Parking zones</h2>
          <p>Manage the campus return zones used by ride geofence validation.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button button-ghost" type="button" onClick={() => void loadZones()} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="button button-primary" type="button" onClick={() => { resetForm(); setShowForm(true); setError(''); setNotice('') }}>
            <Plus size={16} /> Add zone
          </button>
        </div>
      </div>

      {error && <div role="alert" className="panel" style={{ color: '#b42318' }}>{error}</div>}
      {notice && <div role="status" className="panel" style={{ color: '#18794e' }}>{notice}</div>}

      {showForm && (
        <form className="panel content-stack" onSubmit={saveZone}>
          <div className="panel-heading">
            <div><h3>{editingId ? 'Edit parking zone' : 'Create parking zone'}</h3><p>Coordinates should be for the centre of the zone.</p></div>
            <button className="icon-button" type="button" aria-label="Close form" onClick={resetForm}><X size={18} /></button>
          </div>
          <label>Zone name
            <input required maxLength={160} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Main Library parking" />
          </label>
          <div className="two-column-grid">
            <label>Latitude
              <input required type="number" step="any" min="-90" max="90" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="31.XXXX" />
            </label>
            <label>Longitude
              <input required type="number" step="any" min="-180" max="180" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="76.XXXX" />
            </label>
          </div>
          <label>Radius (metres)
            <input required type="number" min="1" max="10000" step="1" value={form.radius_meters} onChange={e => setForm({ ...form, radius_meters: e.target.value })} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            Active zone
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create zone'}</button>
            <button className="button button-ghost" type="button" onClick={resetForm} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div><h3>All parking zones</h3><p>{zones.length} zone{zones.length === 1 ? '' : 's'} · includes inactive zones</p></div>
        </div>
        {loading ? <p>Loading parking zones…</p> : zones.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <MapPin size={30} />
            <p>No parking zones returned by the server.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Zone', 'Coordinates', 'Radius', 'Status', 'Actions'].map(label => <th key={label} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid var(--border, #e3e7e2)' }}>{label}</th>)}
              </tr></thead>
              <tbody>
                {zones.map(zone => <tr key={zone.id}>
                  <td style={{ padding: 12 }}><strong>{zone.name}</strong><div style={{ fontSize: 12, opacity: .65 }}>{zone.id}</div></td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{zone.latitude.toFixed(5)}, {zone.longitude.toFixed(5)}</td>
                  <td style={{ padding: 12 }}>{zone.radius_meters} m</td>
                  <td style={{ padding: 12 }}><span className={`status-chip ${zone.is_active ? 'available' : 'maintenance'}`}>{zone.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ padding: 12, whiteSpace: 'nowrap' }}>
                    <button className="button button-ghost" type="button" onClick={() => beginEdit(zone)}><Pencil size={14} /> Edit</button>{' '}
                    <button className="button button-ghost" type="button" onClick={() => void toggleActive(zone)} title={zone.is_active ? 'Deactivate zone' : 'Activate zone'}>
                      {zone.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {zone.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
