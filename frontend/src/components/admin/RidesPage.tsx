import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  adminApi,
  errorMessage,
  type AdminBicycle,
  type AdminProfile,
  type AdminRide,
  type AdminZone,
} from '../../services/adminApi'
import './AdminPages.css'

const PAGE_SIZE = 25
const OPEN_STATUSES = ['active', 'pending_start', 'pending_end']

const rideStatusText = (status: string) => {
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'active') return 'In progress'
  return 'Pending'
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const duration = (ride: AdminRide) => {
  if (!ride.end_time) return OPEN_STATUSES.includes(ride.status) ? 'Ongoing' : '—'
  const minutes = Math.max(0, Math.round((new Date(ride.end_time).getTime() - new Date(ride.start_time).getTime()) / 60000))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

export default function RidesPage() {
  const [rides, setRides] = useState<AdminRide[]>([])
  const [bicycles, setBicycles] = useState<AdminBicycle[]>([])
  const [zones, setZones] = useState<AdminZone[]>([])
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'completed' | 'cancelled'>('all')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [zoneFilter, setZoneFilter] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [rideList, bikeList, zoneList, profileList] = await Promise.all([
        adminApi.rides(),
        adminApi.bicycles(),
        adminApi.zones(),
        adminApi.profiles().catch(() => [] as AdminProfile[]), // rider names are a bonus; the page still works without them
      ])
      setRides(rideList)
      setBicycles(bikeList)
      setZones(zoneList)
      setProfiles(profileList)
    } catch (err) {
      setError(errorMessage(err, 'Could not load rides.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const lookup = useMemo(() => {
    const bikes = new Map(bicycles.map(b => [b.id, b.display_name || b.qr_code_id]))
    const zoneNames = new Map(zones.map(z => [z.id, z.name]))
    const riders = new Map(profiles.map(p => [p.id, p.full_name || p.roll_number || '']))
    return {
      bike: (id: string) => bikes.get(id) ?? 'Unknown bicycle',
      zone: (id: string | null) => (id ? zoneNames.get(id) ?? 'Unknown zone' : '—'),
      rider: (id: string) => riders.get(id) || `User ${id.slice(0, 8)}`,
    }
  }, [bicycles, zones, profiles])

  const openCount = rides.filter(r => OPEN_STATUSES.includes(r.status)).length
  const completedCount = rides.filter(r => r.status === 'completed').length

  const filtered = rides.filter(ride => {
    if (filter === 'open' && !OPEN_STATUSES.includes(ride.status)) return false
    if (filter === 'completed' && ride.status !== 'completed') return false
    if (filter === 'cancelled' && ride.status !== 'cancelled') return false
    const started = new Date(ride.start_time).getTime()
    if (fromDate && started < new Date(`${fromDate}T00:00:00`).getTime()) return false
    if (toDate && started > new Date(`${toDate}T23:59:59`).getTime()) return false
    if (zoneFilter && ride.start_zone_id !== zoneFilter && ride.end_zone_id !== zoneFilter) return false
    const term = search.trim().toLowerCase()
    if (!term) return true
    return lookup.bike(ride.bicycle_id).toLowerCase().includes(term) || lookup.rider(ride.user_id).toLowerCase().includes(term)
  })

  return (
    <div className="content-stack">
      <div className="adm-summary">
        <div className="adm-summary-card"><span>Total rides</span><strong>{rides.length}</strong></div>
        <div className="adm-summary-card"><span>In progress now</span><strong>{openCount}</strong></div>
        <div className="adm-summary-card"><span>Completed</span><strong>{completedCount}</strong></div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div><h3>Ride records</h3><p>Every ride taken on campus, newest first.</p></div>
          <span className="map-live-pill">{filtered.length} RIDES</span>
        </div>
        <div className="adm-toolbar">
          <input value={search} onChange={e => { setSearch(e.target.value); setShown(PAGE_SIZE) }} placeholder="Search bicycle or rider" />
          <select value={filter} onChange={e => { setFilter(e.target.value as typeof filter); setShown(PAGE_SIZE) }}>
            <option value="all">All rides</option>
            <option value="open">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <label className="adm-inline">From <input type="date" value={fromDate} max={toDate || undefined} onChange={e => { setFromDate(e.target.value); setShown(PAGE_SIZE) }} /></label>
          <label className="adm-inline">To <input type="date" value={toDate} min={fromDate || undefined} onChange={e => { setToDate(e.target.value); setShown(PAGE_SIZE) }} /></label>
          <select value={zoneFilter} onChange={e => { setZoneFilter(e.target.value); setShown(PAGE_SIZE) }}>
            <option value="">All zones</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          {(fromDate || toDate || zoneFilter || search || filter !== 'all') && (
            <button className="button button-ghost" type="button" onClick={() => { setFromDate(''); setToDate(''); setZoneFilter(''); setSearch(''); setFilter('all'); setShown(PAGE_SIZE) }}>Clear filters</button>
          )}
          <button className="button button-ghost" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        </div>
        {error && <p className="adm-msg error">{error}</p>}
        {loading && <p className="adm-empty">Loading…</p>}
        {!loading && !error && filtered.length === 0 && <p className="adm-empty">No rides found.</p>}
        {filtered.length > 0 && (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr><th>Bicycle</th><th>Rider</th><th>Started</th><th>Duration</th><th>From</th><th>To</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map(ride => (
                  <tr key={ride.id}>
                    <td>{lookup.bike(ride.bicycle_id)}</td>
                    <td>{lookup.rider(ride.user_id)}</td>
                    <td>{formatDate(ride.start_time)}</td>
                    <td>{duration(ride)}</td>
                    <td>{lookup.zone(ride.start_zone_id)}</td>
                    <td>{lookup.zone(ride.end_zone_id)}</td>
                    <td><span className={`status-label ${ride.status === 'active' ? 'active' : ride.status}`}>{rideStatusText(ride.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > shown && (
          <div className="adm-toolbar"><button className="button button-ghost" onClick={() => setShown(n => n + PAGE_SIZE)}>Show more</button></div>
        )}
      </section>
    </div>
  )
}