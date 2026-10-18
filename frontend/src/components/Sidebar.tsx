import { Bike, CircleHelp, Clock3, LayoutDashboard, LogOut, MapPin, ShieldCheck, UserRound, Wrench, X } from 'lucide-react'
import type { AppRole } from '../types'

export type Page = 'overview' | 'bicycles' | 'activeRide' | 'history' | 'report' | 'adminBicycles' | 'adminReports'

interface Props {
  role: AppRole
  page: Page
  onNavigate: (page: Page) => void
  onRoleChange: (role: AppRole) => void
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ role, page, onNavigate, onRoleChange, mobileOpen, onClose }: Props) {
  const studentItems: { id: Page; label: string; icon: typeof Bike }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bicycles', label: 'Find bicycles', icon: Bike },
    { id: 'activeRide', label: 'Active ride', icon: MapPin },
    { id: 'history', label: 'Ride history', icon: Clock3 },
    { id: 'report', label: 'Report a problem', icon: CircleHelp },
  ]
  const adminItems: { id: Page; label: string; icon: typeof Bike }[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'adminBicycles', label: 'Bicycle management', icon: Bike },
    { id: 'adminReports', label: 'Reported issues', icon: Wrench },
    { id: 'history', label: 'Ride records', icon: Clock3 },
  ]
  const items = role === 'student' ? studentItems : adminItems
  return <>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark"><Bike size={25} strokeWidth={2.2} /></div>
        <div><div className="brand-name">UniRide<span>.</span></div><div className="brand-subtitle">CAMPUS MOBILITY</div></div>
        <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button>
      </div>
      <div className="campus-pill"><span className="online-dot" /> IIT Ropar campus</div>
      <div className="nav-label">{role === 'student' ? 'YOUR SPACE' : 'MANAGEMENT'}</div>
      <nav className="side-nav">
        {items.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={`nav-item ${page === item.id ? 'nav-active' : ''}`} onClick={() => { onNavigate(item.id); onClose() }}>
            <Icon size={18} /><span>{item.label}</span>{item.id === 'report' && <span className="nav-badge">2</span>}
          </button>
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="eco-card">
          <div className="eco-icon"><ShieldCheck size={18} /></div>
          <strong>A lighter way around campus.</strong>
          <p>Small rides. Greener days.</p>
          <div className="eco-spark">✳</div>
        </div>
        <button className="nav-item muted-nav" onClick={() => onRoleChange(role === 'student' ? 'admin' : 'student')}>
          <UserRound size={18} /><span>Preview {role === 'student' ? 'admin' : 'student'} view</span>
        </button>
        <div className="user-mini">
          <div className="avatar">HM</div>
          <div className="user-mini-text"><strong>{role === 'student' ? 'Harshita Mahor' : 'UniRide Admin'}</strong><span>{role === 'student' ? 'Student account' : 'Administrator'}</span></div>
          <LogOut size={17} className="logout-icon" />
        </div>
      </div>
    </aside>
  </>
}
