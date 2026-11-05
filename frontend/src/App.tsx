import AuthPage from './components/AuthPage'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Bike, CalendarDays, Check, ChevronRight, CircleHelp,
  Clock3, Compass, Leaf, MapPin, Navigation, Search, ShieldCheck, Sparkles,
  TrendingUp, Wrench, X, Zap, QrCode
} from 'lucide-react'
import { Sidebar, type Page } from './components/Sidebar'
import ZonesPage from './components/admin/ZonesPage'
   import MaintenancePage from './components/admin/MaintenancePage'
   import RidesPage from './components/admin/RidesPage'
import BicyclesPage from './components/admin/BicyclesPage'
import { Topbar } from './components/Topbar'
import { BicycleCard } from './components/BicycleCard'
import { api, formatDistanceMeters, pathLengthMeters } from './services/api'
import { adminApi, type AdminBicycle } from './services/adminApi'
import RideRouteMap from './components/RideRouteMap'
import type { AppRole, Bicycle, BicycleStatus, ParkingZoneInfo, ProblemReport, Ride, RideCoordinates, UserProfile } from './types'
import ResetPasswordPage from './components/ResetPasswordPage'
import InteractiveCampusMap from "./components/InteractiveCampusMap";
import QRScanner from "./components/QRScanner";
import './styles/Homepagebikes.css'


const getCurrentLocation = (): Promise<{
  latitude: number
  longitude: number
}> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      error => {
        reject(
          new Error(
            error.code === 1
              ? 'Please allow location access to start your ride.'
              : 'Could not get your location. Please try again.',
          ),
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  })
}

const bikeCode = (b: Bicycle) => b.qrCodeId || b.id

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`

const pageMeta: Record<Page, { title: string; subtitle: string }> = {
  overview: { title: 'Welcome back', subtitle: 'A little less rush. A little more green.' },
  bicycles: { title: 'Find your ride', subtitle: 'Your next campus hop is closer than you think.' },
  activeRide: { title: 'Your ride', subtitle: 'Everything you need while you’re on the move.' },
  history: { title: 'Ride history', subtitle: 'Every ride adds up to a greener campus.' },
  report: { title: 'Something not right?', subtitle: 'Let us know. We’ll get it sorted.' },
  adminBicycles: { title: 'Bicycle management', subtitle: 'Keep the campus fleet ready to roll.' },
  adminReports: { title: 'Reported issues', subtitle: 'A little maintenance goes a long way.' },
  adminZones: { title: 'Parking zones', subtitle: 'Manage campus parking and ride return zones.' },
  adminMaintenance: { title: 'Maintenance', subtitle: 'Repair bicycles and bring them back into service.' },
  adminRides: { title: 'Ride records', subtitle: 'See every ride taken on campus.' },
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal-card" onMouseDown={e => e.stopPropagation()}><button className="icon-button modal-close" onClick={onClose}><X size={18} /></button>{children}</section></div>
}

function CampusMap({ compact = false, refreshKey = 0 }: { compact?: boolean; refreshKey?: number }) {
  return <InteractiveCampusMap compact={compact} refreshKey={refreshKey} />;
}

function StatCard({ label, value, note, icon: Icon, tone = 'green' }: { label: string; value: string; note: string; icon: typeof Bike; tone?: string }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18} /></span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}

function UniRideDashboard({ profile, onSignOut }: { profile: UserProfile; onSignOut: () => void }) {
  const firstName = (profile.full_name || 'there').trim().split(' ')[0]
  const [role, setRole] = useState<AppRole>(profile.role)
  const [page, setPage] = useState<Page>('overview')
  const [bicycles, setBicycles] = useState<Bicycle[]>([])
  const [rides, setRides] = useState<Ride[]>([])
  const [reports, setReports] = useState<ProblemReport[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | BicycleStatus>('All')
  const [selectedBike, setSelectedBike] = useState<Bicycle | null>(null)
  const [toast, setToast] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [rideBike, setRideBike] = useState<Bicycle | null>(null)
  const [activeRideId, setActiveRideId] = useState<string | null>(null)
  const [rideSeconds, setRideSeconds] = useState(0)
  const [issue, setIssue] = useState('Damaged bicycle')
  const [issueBike, setIssueBike] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [adminBikes, setAdminBikes] = useState<AdminBicycle[]>([])
  const [rideStartedAt, setRideStartedAt] = useState<number | null>(null)
  const [ridePoints, setRidePoints] = useState<RideCoordinates[]>([])
  const [gpsStatus, setGpsStatus] = useState<'tracking' | 'denied' | 'unavailable' | 'upload-failed'>('tracking')
  const [mapRefresh, setMapRefresh] = useState(0)
  const [zonesOpen, setZonesOpen] = useState(false)
  const [zoneList, setZoneList] = useState<ParkingZoneInfo[]>([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [routeRide, setRouteRide] = useState<Ride | null>(null)
  const [routePoints, setRoutePoints] = useState<RideCoordinates[]>([])
  const [routeLoading, setRouteLoading] = useState(false)


useEffect(() => {
  let cancelled = false
  const loadData = async () => {
    const results = await Promise.allSettled([
      api.getBicycles(),
      api.getRides(),
      profile.role === 'admin' ? api.getAllReports() : api.getReports(),
      profile.role === 'admin' ? adminApi.bicycles() : Promise.resolve([] as AdminBicycle[]),
      api.getActiveRide(),
    ])
    if (cancelled) return

    const [bicycleResult, rideResult, reportResult, adminBikeResult, activeRideResult] = results
    // Load each section independently: a reports or rides failure must not
    // prevent the student bicycle catalogue from rendering.
    if (bicycleResult.status === 'fulfilled') {
      setBicycles(bicycleResult.value)
      if (bicycleResult.value.length > 0) setIssueBike(bicycleResult.value[0].id)
    } else {
      setToast(bicycleResult.reason instanceof Error
        ? bicycleResult.reason.message
        : 'Could not load bicycles from the server.')
    }

    if (rideResult.status === 'fulfilled') setRides(rideResult.value)
    if (reportResult.status === 'fulfilled') setReports(reportResult.value)
    if (adminBikeResult.status === 'fulfilled') setAdminBikes(adminBikeResult.value)

    // Restore an unfinished ride after a refresh or an accidentally closed tab.
    if (activeRideResult.status === 'fulfilled' && activeRideResult.value) {
      const active = activeRideResult.value
      try {
        const [bike, points] = await Promise.all([api.getBicycle(active.bicycleId), api.getRideLocations(active.rideId)])
        if (cancelled) return
        setRideBike(bike)
        setActiveRideId(active.rideId)
        setRideStartedAt(active.startedAt)
        setRideSeconds(Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000)))
        setRidePoints(points.map(point => ({ latitude: point.latitude, longitude: point.longitude })))
        setPage('activeRide')
        setToast('Your ride in progress has been restored.')
      } catch (restoreError) {
        console.error('Could not restore the active ride:', restoreError)
        setToast('You have an unfinished ride, but it could not be restored. Please refresh.')
      }
    }

    const secondaryErrors = [rideResult, reportResult]
      .filter(result => result.status === 'rejected')
    if (secondaryErrors.length > 0 && bicycleResult.status === 'fulfilled') {
      console.warn('Some UniRide dashboard data could not be loaded:', secondaryErrors)
    }
  }

  void loadData()

  return () => {
    cancelled = true
  }
}, [])
  useEffect(() => {
    if (!rideBike || rideStartedAt === null) return
    // Derived from the real start time, so it stays correct after a refresh or a sleeping tab.
    const tick = () => setRideSeconds(Math.max(0, Math.floor((Date.now() - rideStartedAt) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [rideBike, rideStartedAt])
  // Record the rider's location every 15 seconds while a real ride is active.
  useEffect(() => {
    if (!rideBike || !activeRideId) return
    if (!navigator.geolocation) {
      setToast('GPS tracking is not supported by this browser.')
      return
    }

    let lastSentAt = Date.now()
    setGpsStatus('tracking')
    let requestInProgress = false

    const watchId = navigator.geolocation.watchPosition(
      position => {
        const now = Date.now()
        if (requestInProgress || now - lastSentAt < 15000) return

        requestInProgress = true
        lastSentAt = now

        const point = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        // Show the point locally straight away, even if saving it fails.
        setRidePoints(old => [...old, point])
        setGpsStatus('tracking')

        void api.recordRideLocation(activeRideId, point).catch(error => {
          console.error('Could not record ride GPS location:', error)
          setGpsStatus('upload-failed')
        }).finally(() => {
          requestInProgress = false
        })
      },
      error => {
        console.error('Ride GPS tracking error:', error.message)
        setGpsStatus(error.code === 1 ? 'denied' : 'unavailable')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [rideBike, activeRideId])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredBikes = useMemo(() => bicycles.filter(b => {
    const matchesSearch = `${b.qrCodeId ?? ''} ${b.label} ${b.location}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (statusFilter === 'All' || b.status === statusFilter)
  }), [bicycles, search, statusFilter])
  // Admins count from the full database list (including deactivated bicycles); students see the catalogue.
  const availableCount = bicycles.filter(b => b.status === 'Available').length
  const fleet = {
    total: adminBikes.length,
    available: adminBikes.filter(b => b.status === 'available').length,
    inUse: adminBikes.filter(b => b.status === 'in_use' || b.status === 'reserved').length,
    maintenance: adminBikes.filter(b => b.status === 'maintenance').length,
    offline: adminBikes.filter(b => b.status === 'offline').length,
  }
  const rideDistanceLabel = formatDistanceMeters(pathLengthMeters(ridePoints))
  const homepageAvailableBikes = bicycles.filter(b => b.status === 'Available').slice(0, 3)
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const title = page === 'overview' && role === 'student' ? { ...pageMeta.overview, title: `Good day, ${firstName}` } : pageMeta[page]
  const bikeLabel = (bicycleId: string) =>
    bicycles.find(b => b.id === bicycleId)?.label
    ?? adminBikes.find(b => b.id === bicycleId)?.display_name
    ?? 'Unknown bicycle'

  const refreshBicycles = async () => {
    try {
      setBicycles(await api.getBicycles())
      if (profile.role === 'admin') setAdminBikes(await adminApi.bicycles())
    } catch (error) {
      console.error('Could not refresh bicycles:', error)
    }
    setMapRefresh(n => n + 1)
  }

  const exportRides = () => {
    if (rides.length === 0) { setToast('There are no rides to export yet.'); return }
    const header = ['Ride ID', 'Bicycle', 'From', 'To', 'Date', 'Duration', 'Distance', 'Status']
    const lines = rides.map(r => [r.id, bikeLabel(r.bicycleId), r.startLocation, r.endLocation, r.date, r.duration, r.distance, r.status].map(v => csvCell(String(v))).join(','))
    const blob = new Blob(['\ufeff' + [header.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `uniride-ride-history-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setToast('Ride history exported.')
  }

  const openZones = async () => {
    setZonesOpen(true)
    setZonesLoading(true)
    try {
      setZoneList(await api.getParkingZones())
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not load parking zones.')
    } finally {
      setZonesLoading(false)
    }
  }

  const openRoute = async (ride: Ride) => {
    setRouteRide(ride)
    setRoutePoints([])
    setRouteLoading(true)
    try {
      const points = await api.getRideLocations(ride.id)
      setRoutePoints(points.map(point => ({ latitude: point.latitude, longitude: point.longitude })))
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not load the route.')
    } finally {
      setRouteLoading(false)
    }
  }

  const changeReportStatus = async (reportId: string, status: ProblemReport['status']) => {
    const previous = reports.find(r => r.id === reportId)?.status
    if (!previous || previous === status) return
    // Show the change straight away, then save it. Undo it if saving fails.
    setReports(old => old.map(r => (r.id === reportId ? { ...r, status } : r)))
    try {
      await api.updateReportStatus(reportId, status)
      setToast(`Report marked as ${status.toLowerCase()}.`)
    } catch (error) {
      setReports(old => old.map(r => (r.id === reportId ? { ...r, status: previous } : r)))
      setToast(error instanceof Error ? error.message : 'Could not update the report.')
    }
  }
  const sendToMaintenance = async (report: ProblemReport) => {
    try {
      await adminApi.createMaintenance({
        bicycle_id: report.bicycleId,
        report_id: report.id,
        description: `${report.issue}: ${report.description || 'No description'}`.slice(0, 4000),
      })
      setReports(old => old.map(r => (r.id === report.id && r.status === 'Open' ? { ...r, status: 'In progress' } : r)))
      setToast('Maintenance record created. Open the Maintenance page to assign it.')
      void refreshBicycles()
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not create the maintenance record.')
    }
  }
  const navigate = (next: Page) => { setPage(next); setSearch(''); if (next === 'bicycles') setStatusFilter('All') }
  
  
  const startRide = async (bike: Bicycle) => {
  if (bike.status !== 'Available') return

  try {
    const startLocation = await getCurrentLocation()
const result = await api.startRide(bike.id, startLocation)
    setActiveRideId(result.rideId)
    setRideBike(bike)
    setRideSeconds(0)
    setRideStartedAt(Date.now())
    setRidePoints([startLocation])
    void api.recordRideLocation(result.rideId, startLocation).catch(error => {
      setToast(error instanceof Error ? `Ride started, but the starting GPS point was not saved: ${error.message}` : 'Ride started, but the starting GPS point was not saved.')
    })

    setBicycles(old =>
      old.map(b =>
        b.id === bike.id
          ? { ...b, status: 'In use' }
          : b,
      ),
    )

    setSelectedBike(null)
    navigate('activeRide')
    setToast(`Ride started on ${bikeCode(bike)}. Have a good ride!`)
    void refreshBicycles()
  } catch (error) {
    setToast(
      error instanceof Error
        ? error.message
        : 'Could not start the ride. Please try again.',
    )
  }
}
  const endRide = async () => {
  if (!rideBike || !activeRideId) {
    setToast('No valid active ride was found.')
    return
  }

  try {
    const endLocation = await getCurrentLocation()
    await api.endRide(activeRideId, endLocation)

    setBicycles(old =>
      old.map(b =>
        b.id === rideBike.id
          ? { ...b, status: 'Available' }
          : b,
      ),
    )

    setRideBike(null)
    setActiveRideId(null)
    setRideSeconds(0)
    setRideStartedAt(null)
    setRidePoints([])
    void refreshBicycles()

    navigate('history')
    setToast('Ride ended successfully.')
    try {
      setRides(await api.getRides())
    } catch (refreshError) {
      setToast(refreshError instanceof Error
        ? `Ride ended, but history could not refresh: ${refreshError.message}`
        : 'Ride ended, but history could not refresh.')
    }
  } catch (error) {
    setToast(
      error instanceof Error
        ? error.message
        : 'Could not end the ride. Please try again.',
    )
  }
}

const submitReport = async (e: FormEvent) => {
  e.preventDefault()
  try {
    await api.submitReport({
      bicycleId: issueBike,
      issue,
      description,
    })
    setSubmitted(true)
    setToast('Report submitted successfully.')
  } catch (error) {
    setToast(
      error instanceof Error
        ? error.message
        : 'Could not submit the report. Please try again.',
    )
  }
}

  
  const renderOverview = () => role === 'student' ? <div className="content-stack">
    <section className="welcome-banner">
      <div className="welcome-copy"><div className="eyebrow"><Sparkles size={14} /> CAMPUS, AT YOUR PACE</div><h2>Good rides.<br /><span>Good for the planet.</span></h2><p>Find a bicycle, skip the long walk.</p><div className="welcome-actions"><button className="button button-primary button-lg" onClick={() => navigate('bicycles')}>Find a bicycle <ArrowRight size={17} /></button><button className="button button-ghost button-lg" onClick={() => navigate('history')}>My rides</button></div><div className="welcome-trust"><span><ShieldCheck size={15} /> IIT Ropar students</span></div></div>
      <div className="welcome-bike-panel">
        <div className="welcome-bike-heading">
          <div>
            <span className="welcome-bike-eyebrow">READY TO RIDE</span>
            <h3>Available bicycles</h3>
            <p>Choose a bicycle near your campus location.</p>
          </div>
          <span className="welcome-bike-count">{availableCount} available</span>
        </div>
        {homepageAvailableBikes.length > 0 ? (
          <div className="welcome-bike-list">
            {homepageAvailableBikes.map(bike => (
              <button className="welcome-bike-item" key={bike.id} onClick={() => setSelectedBike(bike)}>
                <span className="welcome-bike-icon" style={{ backgroundColor: bike.color || '#DCEAF6' }}>
                  <Bike size={27} strokeWidth={1.7} />
                </span>
                <span className="welcome-bike-details">
                  <strong>{bikeCode(bike)} <small>{bike.label}</small></strong>
                  <span><MapPin size={12} /> {bike.location}</span>
                  <span className="welcome-bike-distance">{bike.lastUpdated}</span>
                </span>
                <span className="welcome-bike-status"><i /> Available</span>
                <ChevronRight size={17} className="welcome-bike-chevron" />
              </button>
            ))}
          </div>
        ) : (
          <div className="welcome-bike-empty">
            <Bike size={34} />
            <strong>No bicycles available right now</strong>
            <span>Please check again in a little while.</span>
          </div>
        )}
        <button className="welcome-bike-view-all" onClick={() => navigate('bicycles')}>
          View all bicycles <ArrowRight size={15} />
        </button>
      </div>
    </section>
    <div className="section-heading"><div><h2>Your campus at a glance</h2><p>Ready when you are.</p></div><button className="text-button" onClick={() => navigate('bicycles')}>See all bicycles <ArrowUpRight size={16} /></button></div>
    <div className="stats-grid"><StatCard label="Bicycles available" value={String(availableCount)} note="Ready for a ride" icon={Bike} /><StatCard label="Your rides" value={String(rides.length)} note="Rides recorded" icon={Compass} tone="blue" /><StatCard label="Completed rides" value={String(rides.filter(r => r.status === 'Completed').length)} note="Finished trips" icon={Check} tone="yellow" /><StatCard label="Rides in progress" value={String(rides.filter(r => r.status === 'Active').length)} note="Right now" icon={Navigation} tone="sage" /></div>
    <div className="two-column-grid">
      <section className="panel nearby-panel"><div className="panel-heading"><div><h3>Nearby bicycles</h3><p>Pick one and get moving.</p></div><button className="round-arrow" onClick={() => navigate('bicycles')}><ArrowUpRight size={18} /></button></div><div className="nearby-list">{bicycles.slice(0, 3).map(b => <button className="nearby-row" key={b.id} onClick={() => setSelectedBike(b)}><div className="tiny-bike" style={{ background: b.color }}><Bike size={27} /></div><div className="nearby-info"><strong>{bikeCode(b)} <span>{b.label}</span></strong><small><MapPin size={12} /> {b.location}</small></div><span className={`status-chip ${b.status.toLowerCase().replace(' ', '-')}`}><i />{b.status}</span><ChevronRight size={16} className="row-chevron" /></button>)}</div><button className="button button-outline full-width" onClick={() => navigate('bicycles')}>Explore all bicycles <ArrowRight size={16} /></button></section>
      <section className="panel map-panel"><div className="panel-heading"><div><h3>Around campus</h3><p>Explore nearby spots</p></div><span className="map-live-pill"><span className="online-dot" /> LIVE MAP</span></div><CampusMap compact refreshKey={mapRefresh} /><div className="map-footer"><span><i className="legend-dot green-dot" /> Available</span><span><i className="legend-dot gray-dot" /> In use</span><button className="text-button" onClick={() => navigate('bicycles')}>Open map <ArrowRight size={14} /></button></div></section>
    </div>
    <section className="soft-callout"><div className="callout-icon"><Leaf size={22} /></div><div><strong>Every short ride makes a difference.</strong><p>Choose a bicycle for your next trip and help keep campus a little cleaner.</p></div><div className="callout-decoration">✳</div></section>
  </div> : <div className="content-stack">
    <section className="admin-welcome"><div><div className="eyebrow"><ShieldCheck size={14} /> ADMIN WORKSPACE</div><h2>Keep the campus<br /><span>moving smoothly.</span></h2><p>One place to check fleet health, ride activity, and reported issues.</p></div><div className="admin-welcome-mark"><Bike size={96} strokeWidth={1.1} /><span>UniRide / OPS</span></div></section>
    <div className="stats-grid"><StatCard label="Total bicycles" value={String(fleet.total)} note={`${fleet.offline} deactivated`} icon={Bike} /><StatCard label="Available" value={String(fleet.available)} note="Ready to ride" icon={Check} tone="sage" /><StatCard label="In use" value={String(fleet.inUse)} note="Currently out" icon={Navigation} tone="blue" /><StatCard label="Needs attention" value={String(fleet.maintenance)} note="Under maintenance" icon={Zap} tone="yellow" /></div>
    <div className="two-column-grid admin-overview-grid"><section className="panel"><div className="panel-heading"><div><h3>Recent reported issues</h3><p>Keep the fleet safe and reliable.</p></div><button className="text-button" onClick={() => navigate('adminReports')}>View all <ArrowRight size={15} /></button></div>{reports.slice(0, 3).map(r => <div className="issue-row" key={r.id}><div className="issue-mark"><WrenchIcon /></div><div className="issue-copy"><strong>{bikeLabel(r.bicycleId)} · {r.issue}</strong><span>{r.reportedAt}</span></div><span className={`status-label ${r.status.toLowerCase().replace(' ', '-')}`}>{r.status}</span></div>)}</section><section className="panel"><div className="panel-heading"><div><h3>Fleet snapshot</h3><p>Quick look at bicycle availability.</p></div></div><div className="fleet-bar"><span style={{ width: `${(fleet.available / Math.max(1, fleet.total)) * 100}%` }} /></div><div className="fleet-legend"><span><i className="legend-dot green-dot" /> Available <b>{fleet.available}</b></span><span><i className="legend-dot gray-dot" /> In use <b>{fleet.inUse}</b></span><span><i className="legend-dot orange-dot" /> Maintenance <b>{fleet.maintenance}</b></span></div><button className="button button-primary full-width" onClick={() => navigate('adminBicycles')}>Manage bicycle fleet <ArrowRight size={16} /></button></section></div>
  </div>

  const renderBicycles = () => <div className="content-stack">
    <section className="page-intro-card"><div><div className="eyebrow"><Compass size={14} /> FIND YOUR NEXT RIDE</div><h2>Pick your <span>campus companion.</span></h2></div><div className="intro-illustration"><Bike size={90} strokeWidth={1.1} /></div></section>
    <div className="qr-unlock-section"> <button className="button button-primary" onClick={() => setShowQRScanner(true)}> <QrCode size={18} />Scan QR to Unlock</button>{showQRScanner && (<QRScanner onScan={(decodedText) => {setShowQRScanner(false); const scannedQrCodeId = decodedText.trim();const bike = bicycles.find((b) =>b.qrCodeId?.trim().toLowerCase() ===  scannedQrCodeId.toLowerCase() );if (!bike) {setToast('No bicycle found for this QR code.');return;}setSelectedBike(bike);}}onClose={() => setShowQRScanner(false)}/>)}</div>
    <div className="bicycle-toolbar"><label className="search-field"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Try a zone name or “UR-BIKE”..." /></label><div className="filter-pills">{(['All', 'Available', 'In use', 'Maintenance'] as const).map(s => <button key={s} className={`filter-pill ${statusFilter === s ? 'filter-selected' : ''}`} onClick={() => setStatusFilter(s)}>{s}</button>)}</div></div>
    <div className="results-summary"><span><strong>{filteredBikes.length}</strong> bicycles found</span><span><i className="legend-dot green-dot" /> Availability can change</span></div>
    <div className="bicycle-grid">{filteredBikes.map(b => <BicycleCard key={b.id} bicycle={b} onSelect={setSelectedBike} onRide={startRide} />)}</div>
    {filteredBikes.length === 0 && <div className="empty-state"><Bike size={35} /><h3>No bicycles found</h3><p>Try a different search or status filter.</p><button className="button button-outline" onClick={() => { setSearch(''); setStatusFilter('All') }}>Clear filters</button></div>}
    <section className="panel map-panel full-map-panel"><div className="panel-heading"><div><h3>Explore the campus</h3><p>Live bicycle availability and parking zones.</p></div><span className="map-live-pill"><span className="online-dot" /> LIVE MAP</span></div><CampusMap refreshKey={mapRefresh} /></section>
  </div>

  const renderActiveRide = () => <div className="content-stack">
    {rideBike ? <section className="active-ride-layout"><div className="active-ride-main panel"><div className="ride-live-row"><span className="live-pill"><i /> RIDE IN PROGRESS</span> <span className="ride-id">Ride ID · {activeRideId ?? 'Unavailable'}</span></div><div className="ride-bike-orbit"><div className="orbit-ring" /><Bike size={100} strokeWidth={1.15} /></div><h2>Enjoy the ride, <span>{firstName}.</span></h2><p className="muted-text">You’re riding {bikeCode(rideBike)} · {rideBike.label}</p><div className="ride-timer">{String(Math.floor(rideSeconds / 3600)).padStart(2,'0')}:{String(Math.floor((rideSeconds % 3600) / 60)).padStart(2,'0')}:{String(rideSeconds % 60).padStart(2,'0')}</div><span className="muted-text">Time on your ride</span><div className="ride-progress"><span /></div><div className="ride-facts"><div><MapPin size={17} /><span>Started at</span><strong>{rideBike.location}</strong></div><div><Navigation size={17} /><span>Distance</span><strong>{rideDistanceLabel}</strong>{gpsStatus !== 'tracking' && <small className="tiny-note">{gpsStatus === 'denied' ? 'Location access is blocked. Allow it in your browser settings.' : gpsStatus === 'unavailable' ? 'GPS signal lost. Trying again…' : 'Offline: route points could not be saved yet.'}</small>}</div></div><button className="button button-danger button-lg full-width" onClick={endRide}>End ride <ArrowRight size={17} /></button><p className="tiny-note">Please park in a designated zone before ending your ride.</p></div><div className="content-stack"><section className="panel"><div className="panel-heading"><div><h3>Your route</h3><p>{ridePoints.length > 1 ? `${ridePoints.length} GPS points recorded` : 'Route appears as you move'}</p></div></div><RideRouteMap points={ridePoints} /></section><section className="parking-card"><div className="parking-icon"><MapPin size={20} /></div><h3>Ready to park?</h3><p>Look for a designated parking zone near your destination.</p><button className="button button-outline full-width" onClick={() => void openZones()}>View parking zones</button></section></div></section> : <div className="empty-state ride-empty"><div className="empty-icon"><Bike size={42} /></div><h2>No active ride right now.</h2><p>Your next campus trip is just a bicycle away.</p><button className="button button-primary button-lg" onClick={() => navigate('bicycles')}>Find a bicycle <ArrowRight size={17} /></button><div className="empty-footnote"><ShieldCheck size={15} /> Ride details will appear here after you start a ride.</div></div>}
  </div>

  const renderHistory = () => <div className="content-stack">
    <section className="history-summary"><div><div className="eyebrow"><TrendingUp size={14} /> YOUR RIDE JOURNEY</div><h2>Look how far<br /><span>you’ve gone.</span></h2><p>Every trip counts, even the short ones.</p></div><div className="history-big-stat"><div className="history-stat-icon"><Bike size={25} /></div><strong>{rides.length}</strong><span>recorded rides</span></div><div className="history-big-stat"><div className="history-stat-icon green"><Check size={25} /></div><strong>{rides.filter(r => r.status === 'Completed').length}</strong><span>completed rides</span></div></section>
    <section className="panel history-panel"><div className="panel-heading"><div><h3>All rides</h3><p>Your recent ride activity</p></div><button className="button button-outline" onClick={exportRides}><ArrowDownRight size={15} /> Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>Ride / bicycle</th><th>From → To</th><th>Date</th><th>Duration</th><th>Distance</th><th>Status</th><th>Route</th></tr></thead><tbody>{rides.map(r => <tr key={r.id}><td><div className="table-primary">{bikeLabel(r.bicycleId)}</div><div className="table-secondary">{r.id}</div></td><td><div className="route-cell">{r.startLocation}<ArrowRight size={13} />{r.endLocation}</div></td><td>{r.date}</td><td>{r.duration}</td><td>{r.distance}</td><td><span className={`status-label ${r.status.toLowerCase()}`}>{r.status}</span></td><td><button className="text-button" onClick={() => void openRoute(r)}>View route</button></td></tr>)}</tbody></table></div>{rides.length === 0 && <p className="muted-text" style={{ padding: 20 }}>No rides yet. Your completed rides will appear here.</p>}</section>
  </div>
  const renderReport = () => <div className="content-stack report-layout"><section className="report-intro"><div className="report-icon"><CircleHelp size={27} /></div><div className="eyebrow">HELP KEEP UniRide SAFE</div><h2>Spotted something?<br /><span>Tell us about it.</span></h2><p>Flat tyre, loose seat, or a bicycle that needs a little care? Send a report and the campus team can take it from there.</p><div className="report-promise"><Check size={16} /> Reports are reviewed by the UniRide team</div><div className="report-doodle"><Bike size={115} strokeWidth={1.05} /></div></section><section className="panel report-form-panel">{submitted ? <div className="success-state"><div className="success-check"><Check size={30} /></div><h2>Thanks for looking out.</h2><p>Your report has been submitted to the UniRide team.</p><button className="button button-primary" onClick={() => { setSubmitted(false); setPage('overview') }}>Back to overview</button><button className="text-button" onClick={() => setSubmitted(false)}>Submit another report</button></div> : <form onSubmit={submitReport}><div className="form-heading"><h3>Report a bicycle problem</h3><p>Tell us what happened and where.</p></div><label className="field-label">Bicycle ID<select value={issueBike} onChange={e => setIssueBike(e.target.value)}><option value="" disabled>Select a bicycle…</option>{bicycles.map(b => <option key={b.id} value={b.id}>{bikeCode(b)} · {b.location}</option>)}</select></label><label className="field-label">What’s the issue?<select value={issue} onChange={e => setIssue(e.target.value)}><option>Damaged bicycle</option><option>Flat tyre</option><option>Brake issue</option><option>Loose seat or handle</option><option>QR code not working</option><option>Parking zone issue</option><option>Other</option></select></label><label className="field-label"> Description<span className="optional-text">Required</span><textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a few details to help us understand the problem..." required/></label><div className="form-note"><ShieldCheck size={16} /> Your report will be sent to the UniRide team.</div><button className="button button-primary button-lg full-width" type="submit">Send report <ArrowRight size={17} /></button></form>}</section></div>


  const renderAdminReports = () => <div className="content-stack"><section className="page-intro-card report-admin-intro"><div><div className="eyebrow"><WrenchIcon /> FLEET CARE</div><h2>Fix the little things.<br /><span>Keep rides rolling.</span></h2><p>Review reported issues and track the next action.</p></div><div className="intro-illustration"><ShieldCheck size={78} strokeWidth={1.1} /></div></section><div className="report-status-grid"><div className="report-status-card"><span>Open</span><strong>{reports.filter(r => r.status === 'Open').length}</strong><div className="status-track open-track" /></div><div className="report-status-card"><span>In progress</span><strong>{reports.filter(r => r.status === 'In progress').length}</strong><div className="status-track progress-track" /></div><div className="report-status-card"><span>Resolved</span><strong>{reports.filter(r => r.status === 'Resolved').length}</strong><div className="status-track resolved-track" /></div><div className="report-status-card"><span>Rejected</span><strong>{reports.filter(r => r.status === 'Rejected').length}</strong><div className="status-track rejected-track" /></div></div><section className="panel history-panel"><div className="panel-heading"><div><h3>Issue reports</h3><p>Review bicycle issues from around campus.</p></div><span className="map-live-pill">{reports.length} REPORTS</span></div><div className="report-list">{reports.length === 0 && <p className="muted-text" style={{ padding: '0 20px 20px' }}>No reports yet.</p>}{reports.map(r => <div className="admin-report-row" key={r.id}><div className={`report-symbol ${r.status.toLowerCase().replace(' ', '-')}`}><WrenchIcon /></div><div className="admin-report-main"><strong>{bikeLabel(r.bicycleId)} · {r.issue}</strong><span>{r.description || 'No description'}</span><span>{r.reportedAt}</span><small>Report ID {r.id}</small></div><select aria-label={`Status for ${r.id}`} value={r.status} onChange={e => void changeReportStatus(r.id, e.target.value as ProblemReport['status'])}><option>Open</option><option>In progress</option><option>Resolved</option><option>Rejected</option></select>{(r.status === 'Open' || r.status === 'In progress') && <button className="button button-outline" onClick={() => void sendToMaintenance(r)}><WrenchIcon /> Send to maintenance</button>}</div>)}</div></section></div>

  return <div className="app-shell">
    <Sidebar role={role} page={page} onNavigate={navigate} canSwitchRole={profile.role === 'admin'} userName={profile.full_name || 'UniRide user'} onSignOut={onSignOut} onRoleChange={r => { if (profile.role !== 'admin') return; setRole(r); setPage('overview'); setToast(`Previewing ${r} interface.`) }} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    <main className="main-area">
      <Topbar title={title.title} subtitle={title.subtitle} userName={profile.full_name || 'UniRide user'} roleLabel={profile.role === 'admin' ? 'Admin' : 'Student'} onMenu={() => setMobileOpen(true)} onSignOut={onSignOut} reports={reports} onOpenReports={() => navigate('adminReports')} onSearch={value => { setSearch(value); if (value) setPage(role === 'admin' ? 'adminBicycles' : 'bicycles') }} />
      <div className="main-content">
        <div className="breadcrumb"><span>UniRide</span><ChevronRight size={13} /><strong>{role === 'admin' && page === 'overview' ? 'Admin dashboard' : title.title}</strong><span className="breadcrumb-spacer" /><span className="today-label"><CalendarDays size={14} /> {todayLabel}</span></div>
        {page === 'overview' && renderOverview()}
        {page === 'bicycles' && renderBicycles()}
        {page === 'activeRide' && renderActiveRide()}
        {page === 'history' && renderHistory()}
        {page === 'report' && renderReport()}
        {page === 'adminBicycles' && role === 'admin' && <BicyclesPage initialSearch={search} />}
        {page === 'adminReports' && renderAdminReports()}
        {page === 'adminZones' && role === 'admin' && <ZonesPage />}
        {page === 'adminMaintenance' && role === 'admin' && <MaintenancePage />}
        {page === 'adminRides' && role === 'admin' && <RidesPage />}
        <footer className="app-footer"><div className="footer-brand"><Bike size={18} /> UniRide<span>.</span></div><span>Made for a greener campus · IIT Ropar</span></footer>
      </div>
    </main>
    {selectedBike && <Modal onClose={() => setSelectedBike(null)}><div className="bike-detail-modal"><div className="detail-bike-art" style={{ background: selectedBike.color }}><Bike size={120} strokeWidth={1.05} /><span className={`status-chip ${selectedBike.status.toLowerCase().replace(' ', '-')}`}><i />{selectedBike.status}</span></div><div className="eyebrow">UniRide / BICYCLE DETAILS</div><h2>{selectedBike.label}</h2><p className="muted-text">{bikeCode(selectedBike)}</p><div className="detail-list"><div><MapPin size={16} /><span>Current location</span><strong>{selectedBike.location}</strong></div><div><Clock3 size={16} /><span>Last location update</span><strong>{selectedBike.lastUpdated}</strong></div><div><ShieldCheck size={16} /><span>Permanent ID</span><strong>{bikeCode(selectedBike)}</strong></div></div><button className="button button-primary button-lg full-width" disabled={selectedBike.status !== 'Available'} onClick={() => startRide(selectedBike)}>{selectedBike.status === 'Available' ? 'Start ride' : 'Not available'} <ArrowRight size={17} /></button><p className="tiny-note">Start your ride when you are inside an active parking zone.</p></div></Modal>}
    {zonesOpen && <Modal onClose={() => setZonesOpen(false)}><div className="bike-detail-modal"><div className="eyebrow">UniRide / PARKING ZONES</div><h2>Where you can park</h2><p className="muted-text">End your ride inside one of these zones.</p>{zonesLoading ? <p>Loading zones…</p> : <div className="detail-list">{(() => {
      const here = ridePoints[ridePoints.length - 1]
      return zoneList.map(zone => ({ zone, away: here ? pathLengthMeters([here, { latitude: zone.latitude, longitude: zone.longitude }]) : null }))
        .sort((a, b) => (a.away ?? 0) - (b.away ?? 0))
        .map(({ zone, away }) => {
          const free = bicycles.filter(b => b.zoneId === zone.id && b.status === 'Available').length
          const inside = away !== null && away <= zone.radius_meters
          return <div key={zone.id}><MapPin size={16} /><span>{zone.name}{inside ? ' · you are here' : ''}</span><strong>{away === null ? '' : `${formatDistanceMeters(away)} away · `}{free} bikes</strong></div>
        })
    })()}{zoneList.length === 0 && <p className="muted-text">No active parking zones yet.</p>}</div>}<button className="button button-primary button-lg full-width" onClick={() => setZonesOpen(false)}>Done</button></div></Modal>}
    {routeRide && <Modal onClose={() => setRouteRide(null)}><div className="bike-detail-modal"><div className="eyebrow">UniRide / RIDE ROUTE</div><h2>{bikeLabel(routeRide.bicycleId)}</h2><p className="muted-text">{routeRide.date} · {routeRide.duration} · {routeRide.distance}</p>{routeLoading ? <p>Loading route…</p> : <RideRouteMap points={routePoints} />}</div></Modal>}
    {toast && <div className="toast-message"><span className="toast-check"><Check size={15} /></span>{toast}<button onClick={() => setToast('')}><X size={14} /></button></div>}
  </div>
}

function WrenchIcon() {
  return <Wrench size={17} />
}




export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [recovering, setRecovering] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error) console.error('Could not load session:', error.message)
      setSession(data?.session ?? null)
      setCheckingSession(false)
    }
    void loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(newSession)
      setCheckingSession(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Whenever the logged-in user changes, ask OUR backend who they are (role, name).
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError('')
      return
    }
    let cancelled = false
    setProfileError('')
    api.getMe()
      .then(p => { if (!cancelled) setProfile(p) })
      .catch(err => { if (!cancelled) setProfileError(err instanceof Error ? err.message : 'Could not load your profile.') })
    return () => { cancelled = true }
  }, [userId])

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Sign out failed:', error.message)
    setProfile(null)
  }

  if (checkingSession) return <div className="auth-loading">Loading UniRide...</div>

  if (recovering && session) {
    return <ResetPasswordPage onDone={() => setRecovering(false)} />
  }

  if (!session) return <AuthPage />

  if (profileError) {
    return (
      <div className="auth-loading" style={{ flexDirection: 'column', gap: 14, textAlign: 'center', padding: 24 }}>
        <p>Signed in, but the UniRide server could not be reached.</p>
        <small style={{ maxWidth: 420, fontWeight: 400, overflowWrap: 'anywhere' }}>{profileError}</small>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="auth-logout" style={{ position: 'static' }} onClick={() => window.location.reload()}>Try again</button>
          <button type="button" className="auth-logout" style={{ position: 'static' }} onClick={handleSignOut}>Sign out</button>
        </div>
      </div>
    )
  }

  if (!profile) return <div className="auth-loading">Loading your profile...</div>

  return <UniRideDashboard profile={profile} onSignOut={handleSignOut} />
}

