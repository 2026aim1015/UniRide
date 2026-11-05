import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Play, RefreshCw, XCircle } from 'lucide-react'
import {
  adminApi,
  errorMessage,
  type AdminBicycle,
  type AdminProfile,
  type AdminReport,
  type MaintenanceRecord,
  type MaintenanceStatus,
} from '../../services/adminApi'
import './AdminPages.css'

const statusText: Record<MaintenanceStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

export default function MaintenancePage() {
  const [bicycles, setBicycles] = useState<AdminBicycle[]>([])
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [filter, setFilter] = useState<'all' | MaintenanceStatus>('all')
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [reports, setReports] = useState<AdminReport[]>([])
  const [reportId, setReportId] = useState('')
  const [assignee, setAssignee] = useState('')
  const [bicycleId, setBicycleId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [bikeList, recordList, reportList, profileList] = await Promise.all([
        adminApi.bicycles(),
        adminApi.maintenance(),
        adminApi.reports().catch(() => [] as AdminReport[]),
        adminApi.profiles().catch(() => [] as AdminProfile[]),
      ])
      setBicycles(bikeList)
      setRecords(recordList)
      setReports(reportList)
      setProfiles(profileList)
    } catch (err) {
      setError(errorMessage(err, 'Could not load maintenance records.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const bikeName = useMemo(() => {
    const names = new Map<string, string>()
    bicycles.forEach(b => names.set(b.id, b.display_name || b.qr_code_id))
    return (id: string) => names.get(id) ?? 'Unknown bicycle'
  }, [bicycles])

  const staffName = (id: string | null) => {
    if (!id) return 'Unassigned'
    const person = profiles.find(p => p.id === id)
    return person?.full_name || person?.roll_number || `User ${id.slice(0, 8)}`
  }
  // Reports that still need work and do not have an active repair yet.
  const activeReportIds = new Set(records.filter(r => r.status === 'open' || r.status === 'in_progress').map(r => r.report_id))
  const reportableReports = reports.filter(r => (r.status === 'open' || r.status === 'investigating') && !activeReportIds.has(r.id))
  const pickReport = (id: string) => {
    setReportId(id)
    const report = reports.find(r => r.id === id)
    if (report) {
      setBicycleId(report.bicycle_id)
      setDescription(`${report.category}: ${report.description}`.slice(0, 4000))
    }
  }

  const count = (status: MaintenanceStatus) => records.filter(r => r.status === status).length
  const visible = records.filter(r => filter === 'all' || r.status === filter)
  // A bicycle that is being ridden right now should not be pulled into maintenance.
  const selectable = bicycles.filter(b => b.status !== 'in_use')

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!bicycleId) return setError('Please choose a bicycle.')
    if (!description.trim()) return setError('Please describe the work needed.')
    setSaving(true)
    try {
      await adminApi.createMaintenance({
        bicycle_id: bicycleId,
        description: description.trim(),
        ...(reportId ? { report_id: reportId } : {}),
        ...(assignee ? { assigned_to: assignee } : {}),
      })
      setNotice('Maintenance record created. The bicycle is now marked as under maintenance.')
      setBicycleId('')
      setDescription('')
      setReportId('')
      setAssignee('')
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not create the record.'))
    } finally {
      setSaving(false)
    }
  }

  const reassign = async (record: MaintenanceRecord, assignedTo: string) => {
    setError('')
    setNotice('')
    setBusyId(record.id)
    try {
      await adminApi.updateMaintenanceStatus(record.id, record.status, assignedTo || null)
      setNotice(assignedTo ? `Assigned to ${staffName(assignedTo)}.` : 'Assignment removed.')
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not assign the record.'))
    } finally {
      setBusyId(null)
    }
  }

  const changeStatus = async (record: MaintenanceRecord, next: MaintenanceStatus) => {
    setError('')
    setNotice('')
    setBusyId(record.id)
    try {
      await adminApi.updateMaintenanceStatus(record.id, next)
      setNotice(`Record marked as ${statusText[next].toLowerCase()}.`)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Could not update the record.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="content-stack">
      <div className="adm-summary">
        <div className="adm-summary-card"><span>Open</span><strong>{count('open')}</strong></div>
        <div className="adm-summary-card"><span>In progress</span><strong>{count('in_progress')}</strong></div>
        <div className="adm-summary-card"><span>Completed</span><strong>{count('completed')}</strong></div>
        <div className="adm-summary-card"><span>Cancelled</span><strong>{count('cancelled')}</strong></div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div><h3>New maintenance record</h3><p>The chosen bicycle is taken out of service until the work is finished.</p></div>
        </div>
        <form className="adm-form" onSubmit={create}>
          <label>From a problem report (optional)
            <select value={reportId} onChange={e => pickReport(e.target.value)}>
              <option value="">No linked report</option>
              {reportableReports.map(r => (
                <option key={r.id} value={r.id}>{bikeName(r.bicycle_id)} · {r.category}</option>
              ))}
            </select>
          </label>
          <label>Bicycle
            <select value={bicycleId} onChange={e => setBicycleId(e.target.value)} disabled={Boolean(reportId)}>
              <option value="">Select a bicycle…</option>
              {selectable.map(b => (
                <option key={b.id} value={b.id}>{b.display_name || b.qr_code_id} ({b.status.replace('_', ' ')})</option>
              ))}
            </select>
          </label>
          <label>Work needed
            <textarea value={description} maxLength={4000} onChange={e => setDescription(e.target.value)} placeholder="For example: replace rear brake pads" />
          </label>
          <label>Assign to (optional)
            <select value={assignee} onChange={e => setAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {profiles.filter(p => p.role === 'admin').map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.roll_number || p.id.slice(0, 8)}</option>
              ))}
            </select>
          </label>
          <div><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create record'}</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><h3>Maintenance records</h3><p>Start work, finish it, or cancel it.</p></div>
          <span className="map-live-pill">{records.length} RECORDS</span>
        </div>
        <div className="adm-toolbar">
          <select value={filter} onChange={e => setFilter(e.target.value as 'all' | MaintenanceStatus)}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="button button-ghost" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        </div>
        {error && <p className="adm-msg error">{error}</p>}
        {notice && <p className="adm-msg ok">{notice}</p>}
        {loading && <p className="adm-empty">Loading…</p>}
        {!loading && visible.length === 0 && <p className="adm-empty">No maintenance records yet.</p>}
        {visible.map(record => (
          <div className="adm-row" key={record.id}>
            <div className="adm-row-main">
              <strong>{bikeName(record.bicycle_id)}</strong>
              <span>{record.description}</span>
              <small>Assigned to: {staffName(record.assigned_to)}</small>
              <small>
                {record.completed_at ? `Completed ${formatDate(record.completed_at)}` : record.started_at ? `Started ${formatDate(record.started_at)}` : 'Not started yet'}
              </small>
            </div>
            <div className="adm-actions">
              {(record.status === 'open' || record.status === 'in_progress') && (
                <select aria-label="Assign" value={record.assigned_to ?? ''} disabled={busyId === record.id} onChange={e => void reassign(record, e.target.value)}>
                  <option value="">Unassigned</option>
                  {profiles.filter(p => p.role === 'admin').map(p => (
                    <option key={p.id} value={p.id}>{p.full_name || p.roll_number || p.id.slice(0, 8)}</option>
                  ))}
                </select>
              )}
              <span className={`status-label ${record.status.replace('_', '-')}`}>{statusText[record.status]}</span>
              {record.status === 'open' && (
                <button className="button button-ghost" disabled={busyId === record.id} onClick={() => void changeStatus(record, 'in_progress')}><Play size={14} /> Start work</button>
              )}
              {record.status === 'in_progress' && (
                <button className="button button-primary" disabled={busyId === record.id} onClick={() => void changeStatus(record, 'completed')}><CheckCircle2 size={14} /> Mark completed</button>
              )}
              {(record.status === 'open' || record.status === 'in_progress') && (
                <button className="button button-ghost" disabled={busyId === record.id} onClick={() => void changeStatus(record, 'cancelled')}><XCircle size={14} /> Cancel</button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}