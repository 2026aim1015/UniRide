import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bike, Copy, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { adminApi, errorMessage, type AdminBicycle, type AdminZone } from '../../services/adminApi'
import './AdminPages.css'

type Status = 'available' | 'in_use' | 'maintenance' | 'offline' | 'reserved'
type FormState = { display_name: string; current_zone_id: string; status: Status }
const emptyForm: FormState = { display_name: '', current_zone_id: '', status: 'available' }
const statusLabel: Record<string, string> = { available: 'Available', in_use: 'In use', reserved: 'Reserved', maintenance: 'Maintenance', offline: 'Deactivated' }

export default function BicyclesPage({ initialSearch = '' }: { initialSearch?: string }) {
  const [items, setItems] = useState<AdminBicycle[]>([])
  const [zones, setZones] = useState<AdminZone[]>([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<AdminBicycle | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [bikes, parkingZones] = await Promise.all([adminApi.bicycles(), adminApi.zones()])
      setItems(bikes); setZones(parkingZones)
    } catch (e) { setError(errorMessage(e, 'Could not load bicycles.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setQuery(initialSearch) }, [initialSearch])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(b => [b.display_name, b.qr_code_id, b.id, statusLabel[b.status] ?? b.status,
      zones.find(z => z.id === b.current_zone_id)?.name ?? ''].join(' ').toLowerCase().includes(q))
  }, [items, query, zones])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); setError(''); setNotice('') }
  const openEdit = (b: AdminBicycle) => { setEditing(b); setForm({ display_name: b.display_name, current_zone_id: b.current_zone_id ?? '', status: b.status as Status }); setShowForm(true); setError(''); setNotice('') }
  const save = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      if (!form.display_name.trim()) throw new Error('Enter a bicycle name.')
      const body = { display_name: form.display_name.trim(), current_zone_id: form.current_zone_id || null, status: form.status }
      if (editing) await adminApi.updateBicycle(editing.id, body)
      else await adminApi.createBicycle(body)
      setShowForm(false); setNotice(editing ? 'Bicycle updated.' : 'Bicycle added. Its permanent ID has been generated.')
      await load()
    } catch (e) { setError(errorMessage(e, 'Could not save bicycle.')) }
    finally { setSaving(false) }
  }
  const changeStatus = async (b: AdminBicycle, status: Status) => {
    setError(''); setNotice('')
    try { await adminApi.updateBicycle(b.id, { status }); await load(); setNotice(`Bicycle ${status === 'offline' ? 'deactivated' : 'status updated'}.`) }
    catch (e) { setError(errorMessage(e, 'Could not update bicycle status.')) }
  }
  const remove = async (b: AdminBicycle) => {
    if (!window.confirm(`Permanently delete ${b.display_name} (${b.qr_code_id})? This is only possible when no ride/report/maintenance history references it. Prefer deactivation for campus bicycles.`)) return
    setError(''); setNotice('')
    try { await adminApi.deleteBicycle(b.id); await load(); setNotice('Bicycle deleted.') }
    catch (e) { setError(errorMessage(e, 'Could not delete bicycle. Deactivate it if it has history.')) }
  }
  const copyId = async (id: string) => { try { await navigator.clipboard.writeText(id); setNotice(`Copied ${id}.`) } catch { setNotice(`Bicycle ID: ${id}`) } }

  return <div className="content-stack">
    <section className="panel history-panel">
      <div className="panel-heading"><div><h3>Campus bicycles</h3><p>{items.length} registered bicycles · IDs are unique and permanent</p></div><div style={{display:'flex',gap:8}}><button className="button button-outline" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Refresh</button><button className="button button-primary" onClick={openAdd}><Plus size={16}/> Add bicycle</button></div></div>
      {notice && <p role="status" style={{color:'#087c50',padding:'8px 16px'}}>{notice}</p>}{error && <p role="alert" style={{color:'#b42318',padding:'8px 16px'}}>{error}</p>}
      <label className="search-field" style={{maxWidth:520,margin:'18px 0'}}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by bicycle name, permanent ID, QR ID or zone..." /></label>
      {loading ? <p style={{padding:20}}>Loading bicycles...</p> : filtered.length === 0 ? <div className="empty-state"><Bike size={32}/><h3>No bicycles found</h3><p>Try another search or add a bicycle.</p></div> : <div className="table-wrap"><table><thead><tr><th>Bicycle / permanent ID</th><th>Parking zone</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(b=><tr key={b.id}><td><strong>{b.display_name}</strong><div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}><code>{b.qr_code_id}</code><button className="small-action" onClick={()=>void copyId(b.qr_code_id)} title="Copy permanent ID"><Copy size={14}/></button></div></td><td>{zones.find(z=>z.id===b.current_zone_id)?.name ?? 'Unassigned'}</td><td><span className={`status-chip ${b.status==='available'?'available':b.status==='in_use'?'in-use':'maintenance'}`}><i/>{statusLabel[b.status]??b.status}</span></td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button className="small-action" onClick={()=>openEdit(b)}><Pencil size={14}/> Edit</button>{b.status==='offline'?<button className="small-action" onClick={()=>void changeStatus(b,'available')}>Reactivate</button>:b.status!=='in_use'?<button className="small-action" onClick={()=>void changeStatus(b,'offline')}>Deactivate</button>:<span className="muted-text">Ride active</span>}<button className="small-action" style={{color:'#b42318'}} onClick={()=>void remove(b)} disabled={b.status==='in_use'}><Trash2 size={14}/> Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel" style={{padding:22}}><h3>QR-code handoff</h3><p>For each bicycle, encode the exact permanent ID shown in this table (for example, <code>UR-BIKE-XXXXXXXX</code>). Do not encode the database UUID or bicycle name. Manual search and QR scanning use this same code.</p></section>
    {showForm && <div className="modal-backdrop" onMouseDown={()=>setShowForm(false)}><section className="modal-card" onMouseDown={e=>e.stopPropagation()}><button className="icon-button modal-close" onClick={()=>setShowForm(false)}><X size={18}/></button><h2>{editing?'Edit bicycle':'Add bicycle'}</h2><p className="muted-text">{editing?'The permanent bicycle ID cannot be changed.':'A permanent UR-BIKE ID is generated automatically when you save.'}</p><form onSubmit={save}><label className="field-label">Bicycle name<input required maxLength={160} value={form.display_name} onChange={e=>setForm(v=>({...v,display_name:e.target.value}))} placeholder="UniRide Bicycle 01"/></label>{editing && <label className="field-label">Permanent ID<input value={editing.qr_code_id} readOnly/></label>}<label className="field-label">Parking zone<select value={form.current_zone_id} onChange={e=>setForm(v=>({...v,current_zone_id:e.target.value}))}><option value="">Unassigned</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label><label className="field-label">Status<select value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value as Status}))}><option value="available">Available</option><option value="maintenance">Maintenance</option><option value="offline">Deactivated</option><option value="in_use" disabled={!editing || editing.status!=='in_use'}>In use</option></select></label>{error && <p role="alert" style={{color:'#b42318'}}>{error}</p>}<div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:18}}><button type="button" className="button button-outline" onClick={()=>setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving?'Saving...':'Save bicycle'}</button></div></form></section></div>}
  </div>
}
