import { useEffect, useRef, useState } from 'react'
import { Bell, Menu, Search, ChevronDown, LogOut, ClipboardList } from 'lucide-react'
import type { ProblemReport } from '../types'
interface Props { title: string; subtitle: string; userName: string; roleLabel: string; onMenu: () => void; onSearch?: (value: string) => void; onSignOut?: () => void; reports?: ProblemReport[]; onOpenReports?: () => void }
export function Topbar({ title, subtitle, userName, roleLabel, onMenu, onSearch, onSignOut, reports = [], onOpenReports }: Props) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const initials = userName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'U'
  const pending = reports.filter(r => r.status === 'Open' || r.status === 'In progress')
  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!profileRef.current?.contains(target)) setProfileOpen(false)
      if (!notificationsRef.current?.contains(target)) setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return <header className="topbar">
    <button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={21} /></button>
    <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="topbar-actions">
      <label className="top-search"><Search size={16} /><input placeholder="Search bicycles..." onChange={e => onSearch?.(e.target.value)} /><kbd>⌘ K</kbd></label>
      <div className="topbar-popover-anchor" ref={notificationsRef}>
        <button className="icon-button notification-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => {setNotificationsOpen(v=>!v);setProfileOpen(false)}}><Bell size={18} />{pending.length>0&&<i/>}</button>
        {notificationsOpen && <div className="topbar-popover"><strong>Notifications</strong>{pending.length===0?<p className="muted-text">You're all caught up.</p>:<><p>{pending.length} report(s) need attention.</p><button className="text-button" onClick={()=>{setNotificationsOpen(false);onOpenReports?.()}}><ClipboardList size={15}/> Open reported issues</button></>}</div>}
      </div>
      <div className="topbar-popover-anchor" ref={profileRef}>
        <button className="top-user top-user-button" onClick={()=>{setProfileOpen(v=>!v);setNotificationsOpen(false)}} aria-expanded={profileOpen}><div className="avatar">{initials}</div><div><strong>{userName.split(' ')[0]}</strong><span>{roleLabel}</span></div><ChevronDown size={15}/></button>
        {profileOpen && <div className="topbar-popover profile-popover"><strong>{userName}</strong><span className="muted-text">{roleLabel} account</span><button className="text-button" onClick={()=>{setProfileOpen(false);onSignOut?.()}}><LogOut size={15}/> Sign out</button></div>}
      </div>
    </div>
  </header>
}
