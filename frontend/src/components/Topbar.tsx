import { Bell, Menu, Search, ChevronDown } from 'lucide-react'
interface Props { title: string; subtitle: string; userName: string; roleLabel: string; onMenu: () => void; onSearch?: (value: string) => void }
export function Topbar({ title, subtitle, userName, roleLabel, onMenu, onSearch }: Props) {
  const initials = userName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'U'
  return <header className="topbar">
    <button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={21} /></button>
    <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="topbar-actions">
      <label className="top-search"><Search size={16} /><input placeholder="Search bicycles..." onChange={e => onSearch?.(e.target.value)} /><kbd>⌘ K</kbd></label>
      <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
      <div className="top-user"><div className="avatar">{initials}</div><div><strong>{userName.split(' ')[0]}</strong><span>{roleLabel}</span></div><ChevronDown size={15} /></div>
    </div>
  </header>
}
