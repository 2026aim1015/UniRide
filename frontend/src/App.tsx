import AuthPage from './components/AuthPage'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Bike, CalendarDays, Check, ChevronRight, CircleHelp,
  Clock3, Compass, Leaf, MapPin, Navigation, Plus, Search, ShieldCheck, Sparkles,
  TrendingUp, Wrench, X, Zap, QrCode
} from 'lucide-react'
import { Sidebar, type Page } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { BicycleCard } from './components/BicycleCard'
import { api } from './services/api'
import { demoBicycles, demoReports, demoRides } from './data/demoData'
import type { AppRole, Bicycle, BicycleStatus, ProblemReport, Ride } from './types'
import InteractiveCampusMap from "./components/InteractiveCampusMap";
import QRScanner from "./components/QRScanner";


const pageMeta: Record<Page, { title: string; subtitle: string }> = {
  overview: { title: 'Good day, Harshita', subtitle: 'A little less rush. A little more green.' },
  bicycles: { title: 'Find your ride', subtitle: 'Your next campus hop is closer than you think.' },
  activeRide: { title: 'Your ride', subtitle: 'Everything you need while you’re on the move.' },
  history: { title: 'Ride history', subtitle: 'Every ride adds up to a greener campus.' },
  report: { title: 'Something not right?', subtitle: 'Let us know. We’ll get it sorted.' },
  adminBicycles: { title: 'Bicycle management', subtitle: 'Keep the campus fleet ready to roll.' },
  adminReports: { title: 'Reported issues', subtitle: 'A little maintenance goes a long way.' },
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal-card" onMouseDown={e => e.stopPropagation()}><button className="icon-button modal-close" onClick={onClose}><X size={18} /></button>{children}</section></div>
}

function CampusMap({ compact = false }: { compact?: boolean }) {
  return <InteractiveCampusMap compact={compact} />;
}

function StatCard({ label, value, note, icon: Icon, tone = 'green' }: { label: string; value: string; note: string; icon: typeof Bike; tone?: string }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18} /></span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}

function UniRideDashboard() {
  const [role, setRole] = useState<AppRole>('student')
  const [page, setPage] = useState<Page>('overview')
  const [bicycles, setBicycles] = useState<Bicycle[]>(demoBicycles)
  const [rides, setRides] = useState<Ride[]>(demoRides)
  const [reports, setReports] = useState<ProblemReport[]>(demoReports)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | BicycleStatus>('All')
  const [selectedBike, setSelectedBike] = useState<Bicycle | null>(null)
  const [toast, setToast] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [rideBike, setRideBike] = useState<Bicycle | null>(null)
  const [rideSeconds, setRideSeconds] = useState(12 * 60 + 34)
  const [issue, setIssue] = useState('Damaged bicycle')
  const [issueBike, setIssueBike] = useState('B-108')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false);


  useEffect(() => { api.getBicycles().then(setBicycles).catch(() => setBicycles(demoBicycles)); api.getRides().then(setRides).catch(() => setRides(demoRides)); api.getReports().then(setReports).catch(() => setReports(demoReports)) }, [])
  useEffect(() => {
    if (!rideBike) return
    const timer = window.setInterval(() => setRideSeconds(s => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [rideBike])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredBikes = useMemo(() => bicycles.filter(b => {
    const matchesSearch = `${b.id} ${b.label} ${b.location}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (statusFilter === 'All' || b.status === statusFilter)
  }), [bicycles, search, statusFilter])
  const availableCount = bicycles.filter(b => b.status === 'Available').length
  const title = pageMeta[page]

  const navigate = (next: Page) => { setPage(next); setSearch(''); if (next === 'bicycles') setStatusFilter('All') }
  const startRide = async (bike: Bicycle) => {
    if (bike.status !== 'Available') return
    try { await api.startRide(bike.id) } catch { /* keep demo interaction responsive */ }
    setRideBike(bike); setRideSeconds(0); setBicycles(old => old.map(b => b.id === bike.id ? { ...b, status: 'In use' } : b))
    setSelectedBike(null); navigate('activeRide'); setToast(`Ride started on ${bike.id}. Have a good ride!`)
  }
  const endRide = async () => {
    try { await api.endRide('DEMO-ACTIVE') } catch { /* demo fallback */ }
    if (rideBike) {
      setRides(old => [{ id: `R-${Date.now().toString().slice(-4)}`, bicycleId: rideBike.id, startLocation: rideBike.location, endLocation: 'Academic Block', date: 'Just now', duration: `${Math.max(1, Math.floor(rideSeconds / 60))} min`, distance: '1.2 km', status: 'Completed' }, ...old])
      setBicycles(old => old.map(b => b.id === rideBike.id ? { ...b, status: 'Available', location: 'Academic Block' } : b))
    }
    setRideBike(null); navigate('history'); setToast('Ride ended. Thanks for riding green!')
  }
  const submitReport = async (e: FormEvent) => {
    e.preventDefault()
    try { await api.submitReport({ bicycleId: issueBike, issue, description }) } catch { /* demo fallback */ }
    setReports(old => [{ id: `P-${Date.now().toString().slice(-3)}`, bicycleId: issueBike, issue, location: bicycles.find(b => b.id === issueBike)?.location || 'Campus', status: 'Open', reportedAt: 'Just now' }, ...old])
    setSubmitted(true); setDescription(''); setToast('Thanks — your report has been received.')
  }
  
  const renderOverview = () => role === 'student' ? <div className="content-stack">
    <section className="welcome-banner">
      <div className="welcome-copy"><div className="eyebrow"><Sparkles size={14} /> CAMPUS, AT YOUR PACE</div><h2>Good rides.<br /><span>Good for the planet.</span></h2><p>Find a bicycle, skip the long walk, and make your next campus hop a little greener.</p><div className="welcome-actions"><button className="button button-primary button-lg" onClick={() => navigate('bicycles')}>Find a bicycle <ArrowRight size={17} /></button><button className="button button-ghost button-lg" onClick={() => navigate('history')}>My rides</button></div><div className="welcome-trust"><span><ShieldCheck size={15} /> IIT Ropar students</span><span><Leaf size={15} /> A greener campus</span></div></div>
      <div className="welcome-art"><div className="sun-orb" /><div className="art-hill hill-back" /><div className="art-hill hill-front" /><div className="art-building building-one" /><div className="art-building building-two" /><div className="art-path" /><div className="art-bike"><Bike size={146} strokeWidth={1.15} /></div><div className="floating-card"><div className="floating-icon"><MapPin size={17} /></div><div><strong>Campus is close</strong><span>Your next stop is 2 min away</span></div></div><div className="art-sticker">RIDE<br />HAPPY <span>✳</span></div></div>
    </section>
    <div className="section-heading"><div><h2>Your campus at a glance</h2><p>Ready when you are.</p></div><button className="text-button" onClick={() => navigate('bicycles')}>See all bicycles <ArrowUpRight size={16} /></button></div>
    <div className="stats-grid"><StatCard label="Bicycles available" value={String(availableCount)} note="Ready for a ride" icon={Bike} /><StatCard label="Your rides" value={String(rides.length)} note="+ Keep moving" icon={Compass} tone="blue" /><StatCard label="Time saved" value="2.4 hrs" note="Compared with walking" icon={Clock3} tone="yellow" /><StatCard label="Greener choices" value="4.8 kg" note="Estimated CO₂ avoided" icon={Leaf} tone="sage" /></div>
    <div className="two-column-grid">
      <section className="panel nearby-panel"><div className="panel-heading"><div><h3>Nearby bicycles</h3><p>Pick one and get moving.</p></div><button className="round-arrow" onClick={() => navigate('bicycles')}><ArrowUpRight size={18} /></button></div><div className="nearby-list">{bicycles.slice(0, 3).map(b => <button className="nearby-row" key={b.id} onClick={() => setSelectedBike(b)}><div className="tiny-bike" style={{ background: b.color }}><Bike size={27} /></div><div className="nearby-info"><strong>{b.id} <span>{b.label}</span></strong><small><MapPin size={12} /> {b.location} · {b.distance}</small></div><span className={`status-chip ${b.status.toLowerCase().replace(' ', '-')}`}><i />{b.status}</span><ChevronRight size={16} className="row-chevron" /></button>)}</div><button className="button button-outline full-width" onClick={() => navigate('bicycles')}>Explore all bicycles <ArrowRight size={16} /></button></section>
      <section className="panel map-panel"><div className="panel-heading"><div><h3>Around campus</h3><p>Explore nearby spots</p></div><span className="map-live-pill"><span className="online-dot" /> DEMO MAP</span></div><CampusMap compact /><div className="map-footer"><span><i className="legend-dot green-dot" /> Available</span><span><i className="legend-dot gray-dot" /> In use</span><button className="text-button" onClick={() => navigate('bicycles')}>Open map <ArrowRight size={14} /></button></div></section>
    </div>
    <section className="soft-callout"><div className="callout-icon"><Leaf size={22} /></div><div><strong>Every short ride makes a difference.</strong><p>Choose a bicycle for your next trip and help keep campus a little cleaner.</p></div><div className="callout-decoration">✳</div></section>
  </div> : <div className="content-stack">
    <section className="admin-welcome"><div><div className="eyebrow"><ShieldCheck size={14} /> ADMIN WORKSPACE</div><h2>Keep the campus<br /><span>moving smoothly.</span></h2><p>One place to check fleet health, ride activity, and reported issues.</p></div><div className="admin-welcome-mark"><Bike size={96} strokeWidth={1.1} /><span>UniRide / OPS</span></div></section>
    <div className="stats-grid"><StatCard label="Total bicycles" value={String(bicycles.length)} note="Across campus" icon={Bike} /><StatCard label="Available" value={String(availableCount)} note="Ready to ride" icon={Check} tone="sage" /><StatCard label="In use" value={String(bicycles.filter(b => b.status === 'In use').length)} note="Currently out" icon={Navigation} tone="blue" /><StatCard label="Needs attention" value={String(bicycles.filter(b => b.status === 'Maintenance').length)} note="Maintenance queue" icon={Zap} tone="yellow" /></div>
    <div className="two-column-grid admin-overview-grid"><section className="panel"><div className="panel-heading"><div><h3>Recent reported issues</h3><p>Keep the fleet safe and reliable.</p></div><button className="text-button" onClick={() => navigate('adminReports')}>View all <ArrowRight size={15} /></button></div>{reports.slice(0, 3).map(r => <div className="issue-row" key={r.id}><div className="issue-mark"><WrenchIcon /></div><div className="issue-copy"><strong>{r.bicycleId} · {r.issue}</strong><span>{r.location} · {r.reportedAt}</span></div><span className={`status-label ${r.status.toLowerCase().replace(' ', '-')}`}>{r.status}</span></div>)}</section><section className="panel"><div className="panel-heading"><div><h3>Fleet snapshot</h3><p>Quick look at bicycle availability.</p></div></div><div className="fleet-bar"><span style={{ width: `${(availableCount / Math.max(1, bicycles.length)) * 100}%` }} /></div><div className="fleet-legend"><span><i className="legend-dot green-dot" /> Available <b>{availableCount}</b></span><span><i className="legend-dot gray-dot" /> In use <b>{bicycles.filter(b => b.status === 'In use').length}</b></span><span><i className="legend-dot orange-dot" /> Maintenance <b>{bicycles.filter(b => b.status === 'Maintenance').length}</b></span></div><button className="button button-primary full-width" onClick={() => navigate('adminBicycles')}>Manage bicycle fleet <ArrowRight size={16} /></button></section></div>
  </div>

  const renderBicycles = () => <div className="content-stack">
    <section className="page-intro-card"><div><div className="eyebrow"><Compass size={14} /> FIND YOUR NEXT RIDE</div><h2>Pick your <span>campus companion.</span></h2><p>Search by bicycle ID, landmark, or location. Availability is shown for demo data.</p></div><div className="intro-illustration"><Bike size={90} strokeWidth={1.1} /></div></section>
    <div className="qr-unlock-section"> <button className="button button-primary" onClick={() => setShowQRScanner(true)}> <QrCode size={18} />Scan QR to Unlock</button>{showQRScanner && (<QRScanner onScan={(decodedText) => { setShowQRScanner(false);const bicycleId = decodedText.trim();const bike = bicycles.find((b) => b.id.toLowerCase() === bicycleId.toLowerCase()); if (!bike) {setToast(`Bicycle ${bicycleId} not found.`);return;}setSelectedBike(bike);}}onClose={() => setShowQRScanner(false)}/>)}</div>
    <div className="bicycle-toolbar"><label className="search-field"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Try “Library” or “B-023”..." /></label><div className="filter-pills">{(['All', 'Available', 'In use', 'Maintenance'] as const).map(s => <button key={s} className={`filter-pill ${statusFilter === s ? 'filter-selected' : ''}`} onClick={() => setStatusFilter(s)}>{s}</button>)}</div></div>
    <div className="results-summary"><span><strong>{filteredBikes.length}</strong> bicycles found</span><span><i className="legend-dot green-dot" /> Availability can change</span></div>
    <div className="bicycle-grid">{filteredBikes.map(b => <BicycleCard key={b.id} bicycle={b} onSelect={setSelectedBike} onRide={startRide} />)}</div>
    {filteredBikes.length === 0 && <div className="empty-state"><Bike size={35} /><h3>No bicycles found</h3><p>Try a different search or status filter.</p><button className="button button-outline" onClick={() => { setSearch(''); setStatusFilter('All') }}>Clear filters</button></div>}
    <section className="panel map-panel full-map-panel"><div className="panel-heading"><div><h3>Explore the campus</h3><p>Illustrative locations for the first frontend version.</p></div><span className="map-live-pill">MAP PREVIEW</span></div><CampusMap /></section>
  </div>

  const renderActiveRide = () => <div className="content-stack">
    {rideBike ? <section className="active-ride-layout"><div className="active-ride-main panel"><div className="ride-live-row"><span className="live-pill"><i /> RIDE IN PROGRESS</span><span className="ride-id">Ride ID · DEMO-001</span></div><div className="ride-bike-orbit"><div className="orbit-ring" /><Bike size={100} strokeWidth={1.15} /></div><h2>Enjoy the ride, <span>Harshita.</span></h2><p className="muted-text">You’re riding {rideBike.id} · {rideBike.label}</p><div className="ride-timer">{String(Math.floor(rideSeconds / 3600)).padStart(2,'0')}:{String(Math.floor((rideSeconds % 3600) / 60)).padStart(2,'0')}:{String(rideSeconds % 60).padStart(2,'0')}</div><span className="muted-text">Time on your ride</span><div className="ride-progress"><span /></div><div className="ride-facts"><div><MapPin size={17} /><span>Started at</span><strong>{rideBike.location}</strong></div><div><Navigation size={17} /><span>Distance</span><strong>1.2 km <small>· demo</small></strong></div></div><button className="button button-danger button-lg full-width" onClick={endRide}>End ride <ArrowRight size={17} /></button><p className="tiny-note">Please park in a designated zone before ending your ride.</p></div><div className="content-stack"><section className="panel"><div className="panel-heading"><div><h3>Near your route</h3><p>Campus map preview</p></div></div><CampusMap compact /></section><section className="parking-card"><div className="parking-icon"><MapPin size={20} /></div><h3>Ready to park?</h3><p>Look for a designated parking zone near your destination.</p><button className="button button-outline full-width" onClick={() => setToast('Parking zones will be connected to the backend.')}>View parking zones</button></section></div></section> : <div className="empty-state ride-empty"><div className="empty-icon"><Bike size={42} /></div><h2>No active ride right now.</h2><p>Your next campus trip is just a bicycle away.</p><button className="button button-primary button-lg" onClick={() => navigate('bicycles')}>Find a bicycle <ArrowRight size={17} /></button><div className="empty-footnote"><ShieldCheck size={15} /> Ride details will appear here after you start a ride.</div></div>}
  </div>

  const renderHistory = () => <div className="content-stack">
    <section className="history-summary"><div><div className="eyebrow"><TrendingUp size={14} /> YOUR RIDE JOURNEY</div><h2>Look how far<br /><span>you’ve gone.</span></h2><p>Every trip counts, even the short ones.</p></div><div className="history-big-stat"><div className="history-stat-icon"><Bike size={25} /></div><strong>{rides.length}</strong><span>recorded rides</span></div><div className="history-big-stat"><div className="history-stat-icon green"><Leaf size={25} /></div><strong>4.8 kg</strong><span>estimated CO₂ saved</span></div></section>
    <section className="panel history-panel"><div className="panel-heading"><div><h3>All rides</h3><p>Your recent ride activity</p></div><button className="button button-outline" onClick={() => setToast('Export will be available after backend integration.')}><ArrowDownRight size={15} /> Export</button></div><div className="table-wrap"><table><thead><tr><th>Ride / bicycle</th><th>From → To</th><th>Date</th><th>Duration</th><th>Distance</th><th>Status</th></tr></thead><tbody>{rides.map(r => <tr key={r.id}><td><div className="table-primary">{r.bicycleId}</div><div className="table-secondary">{r.id}</div></td><td><div className="route-cell">{r.startLocation}<ArrowRight size={13} />{r.endLocation}</div></td><td>{r.date}</td><td>{r.duration}</td><td>{r.distance}</td><td><span className={`status-label ${r.status.toLowerCase()}`}>{r.status}</span></td></tr>)}</tbody></table></div></section>
  </div>

  const renderReport = () => <div className="content-stack report-layout"><section className="report-intro"><div className="report-icon"><CircleHelp size={27} /></div><div className="eyebrow">HELP KEEP UniRide SAFE</div><h2>Spotted something?<br /><span>Tell us about it.</span></h2><p>Flat tyre, loose seat, or a bicycle that needs a little care? Send a report and the campus team can take it from there.</p><div className="report-promise"><Check size={16} /> Reports are reviewed by the UniRide team</div><div className="report-doodle"><Bike size={115} strokeWidth={1.05} /></div></section><section className="panel report-form-panel">{submitted ? <div className="success-state"><div className="success-check"><Check size={30} /></div><h2>Thanks for looking out.</h2><p>Your demo report has been recorded in this session.</p><button className="button button-primary" onClick={() => { setSubmitted(false); setPage('overview') }}>Back to overview</button><button className="text-button" onClick={() => setSubmitted(false)}>Submit another report</button></div> : <form onSubmit={submitReport}><div className="form-heading"><h3>Report a bicycle problem</h3><p>Tell us what happened and where.</p></div><label className="field-label">Bicycle ID<select value={issueBike} onChange={e => setIssueBike(e.target.value)}>{bicycles.map(b => <option key={b.id} value={b.id}>{b.id} · {b.location}</option>)}</select></label><label className="field-label">What’s the issue?<select value={issue} onChange={e => setIssue(e.target.value)}><option>Damaged bicycle</option><option>Flat tyre</option><option>Brake issue</option><option>Loose seat or handle</option><option>QR code not working</option><option>Parking zone issue</option><option>Other</option></select></label><label className="field-label">Anything else? <span className="optional-text">Optional</span><textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a few details to help us understand the problem..." /></label><div className="form-note"><ShieldCheck size={16} /> You can submit this demo form without uploading a photo.</div><button className="button button-primary button-lg full-width" type="submit">Send report <ArrowRight size={17} /></button></form>}</section></div>

  const renderAdminBicycles = () => <div className="content-stack"><section className="admin-welcome compact-admin"><div><div className="eyebrow"><Bike size={14} /> FLEET MANAGEMENT</div><h2>Every bicycle,<br /><span>in good hands.</span></h2><p>Monitor status and keep the campus fleet moving.</p></div><div className="admin-welcome-mark"><Bike size={80} strokeWidth={1.1} /><span>FLEET / {bicycles.length} UNITS</span></div></section><div className="stats-grid"><StatCard label="Total bicycles" value={String(bicycles.length)} note="Across campus" icon={Bike} /><StatCard label="Available" value={String(availableCount)} note="Ready to ride" icon={Check} tone="sage" /><StatCard label="In use" value={String(bicycles.filter(b => b.status === 'In use').length)} note="Currently out" icon={Navigation} tone="blue" /><StatCard label="Maintenance" value={String(bicycles.filter(b => b.status === 'Maintenance').length)} note="Needs attention" icon={Zap} tone="yellow" /></div><section className="panel history-panel"><div className="panel-heading"><div><h3>Campus bicycle fleet</h3><p>Demo inventory · changes reset on refresh</p></div><button className="button button-primary" onClick={() => { const id = `B-${String(Math.floor(Math.random()*800)+200)}`; setBicycles(old => [{ id, label:'New Campus Ride', location:'Central Library', distance:'2 min walk', status:'Available', lastServiced:'Not serviced yet', color:'#e0f1e8' }, ...old]); setToast(`${id} added to demo fleet.`) }}><Plus size={16} /> Add bicycle</button></div><div className="table-wrap"><table><thead><tr><th>Bicycle</th><th>Location</th><th>Status</th><th>Last serviced</th><th>Action</th></tr></thead><tbody>{bicycles.map(b => <tr key={b.id}><td><div className="bike-table-cell"><div className="tiny-bike"><Bike size={22} /></div><div><div className="table-primary">{b.id}</div><div className="table-secondary">{b.label}</div></div></div></td><td>{b.location}</td><td><span className={`status-chip ${b.status.toLowerCase().replace(' ', '-')}`}><i />{b.status}</span></td><td>{b.lastServiced}</td><td><button className="small-action" onClick={() => { setSelectedBike(b); }}>View details <ChevronRight size={14} /></button></td></tr>)}</tbody></table></div></section></div>

  const renderAdminReports = () => <div className="content-stack"><section className="page-intro-card report-admin-intro"><div><div className="eyebrow"><WrenchIcon /> FLEET CARE</div><h2>Fix the little things.<br /><span>Keep rides rolling.</span></h2><p>Review reported issues and track the next action.</p></div><div className="intro-illustration"><ShieldCheck size={78} strokeWidth={1.1} /></div></section><div className="report-status-grid"><div className="report-status-card"><span>Open</span><strong>{reports.filter(r => r.status === 'Open').length}</strong><div className="status-track open-track" /></div><div className="report-status-card"><span>In progress</span><strong>{reports.filter(r => r.status === 'In progress').length}</strong><div className="status-track progress-track" /></div><div className="report-status-card"><span>Resolved</span><strong>{reports.filter(r => r.status === 'Resolved').length}</strong><div className="status-track resolved-track" /></div></div><section className="panel history-panel"><div className="panel-heading"><div><h3>Issue reports</h3><p>Review bicycle issues from around campus.</p></div><span className="map-live-pill">{reports.length} REPORTS</span></div><div className="report-list">{reports.map(r => <div className="admin-report-row" key={r.id}><div className={`report-symbol ${r.status.toLowerCase().replace(' ', '-')}`}><WrenchIcon /></div><div className="admin-report-main"><strong>{r.bicycleId} · {r.issue}</strong><span>{r.location} · {r.reportedAt}</span><small>Report ID {r.id}</small></div><select aria-label={`Status for ${r.id}`} value={r.status} onChange={e => setReports(old => old.map(x => x.id === r.id ? { ...x, status: e.target.value as ProblemReport['status'] } : x))}><option>Open</option><option>In progress</option><option>Resolved</option></select></div>)}</div></section></div>

  return <div className="app-shell">
    <Sidebar role={role} page={page} onNavigate={navigate} onRoleChange={r => { setRole(r); setPage('overview'); setToast(`Previewing ${r} interface.`) }} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    <main className="main-area">
      <Topbar title={title.title} subtitle={title.subtitle} onMenu={() => setMobileOpen(true)} onSearch={value => { setSearch(value); if (value) setPage('bicycles') }} />
      <div className="main-content">
        <div className="breadcrumb"><span>UniRide</span><ChevronRight size={13} /><strong>{role === 'admin' && page === 'overview' ? 'Admin dashboard' : title.title}</strong><span className="breadcrumb-spacer" /><span className="today-label"><CalendarDays size={14} /> Saturday, 17 October 2026</span></div>
        {page === 'overview' && renderOverview()}
        {page === 'bicycles' && renderBicycles()}
        {page === 'activeRide' && renderActiveRide()}
        {page === 'history' && renderHistory()}
        {page === 'report' && renderReport()}
        {page === 'adminBicycles' && renderAdminBicycles()}
        {page === 'adminReports' && renderAdminReports()}
        <footer className="app-footer"><div className="footer-brand"><Bike size={18} /> UniRide<span>.</span></div><span>Made for a greener campus · IIT Ropar</span><span className="footer-demo"><i /> DEMO DATA</span></footer>
      </div>
    </main>
    {selectedBike && <Modal onClose={() => setSelectedBike(null)}><div className="bike-detail-modal"><div className="detail-bike-art" style={{ background: selectedBike.color }}><Bike size={120} strokeWidth={1.05} /><span className={`status-chip ${selectedBike.status.toLowerCase().replace(' ', '-')}`}><i />{selectedBike.status}</span></div><div className="eyebrow">UniRide / BICYCLE DETAILS</div><h2>{selectedBike.label}</h2><p className="muted-text">{selectedBike.id} · Ready for your next campus hop</p><div className="detail-list"><div><MapPin size={16} /><span>Current location</span><strong>{selectedBike.location}</strong></div><div><Clock3 size={16} /><span>Walking distance</span><strong>{selectedBike.distance}</strong></div><div><ShieldCheck size={16} /><span>Last serviced</span><strong>{selectedBike.lastServiced}</strong></div></div><button className="button button-primary button-lg full-width" disabled={selectedBike.status !== 'Available'} onClick={() => startRide(selectedBike)}>{selectedBike.status === 'Available' ? 'Start ride' : 'Not available'} <ArrowRight size={17} /></button><p className="tiny-note">Ride start is simulated in this frontend preview.</p></div></Modal>}
    {toast && <div className="toast-message"><span className="toast-check"><Check size={15} /></span>{toast}<button onClick={() => setToast('')}><X size={14} /></button></div>}
  </div>
}

function WrenchIcon() {
  return <Wrench size={17} />
}




export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (mounted) {
        if (error) {
          console.error('Could not load session:', error.message)
        }

        setSession(data?.session ?? null)
        setCheckingSession(false)
      }
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setCheckingSession(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out failed:', error.message)
    }
  }

  if (checkingSession) {
    return <div className="auth-loading">Loading UniRide...</div>
  }

  if (!session) {
    return <AuthPage />
  }

  return (
    <>
      <UniRideDashboard />

      <button
        type="button"
        className="auth-logout"
        onClick={handleSignOut}
      >
        Sign out
      </button>
    </>
  )
}


