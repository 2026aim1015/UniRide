import { Bell, Menu, Search, ChevronDown } from 'lucide-react'
interface Props { title: string; subtitle: string; onMenu: () => void; onSearch?: (value: string) => void }
export function Topbar({ title, subtitle, onMenu, onSearch }: Props) {
  return <header className="topbar">
    <button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={21} /></button>
    <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="topbar-actions">
      <label className="top-search"><Search size={16} /><input placeholder="Search bicycles..." onChange={e => onSearch?.(e.target.value)} /><kbd>⌘ K</kbd></label>
      <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
      <div className="top-user"><div className="avatar">HM</div><div><strong>Harshita</strong><span>Student</span></div><ChevronDown size={15} /></div>
    </div>
  </header>
}
