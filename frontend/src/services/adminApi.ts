import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export type AdminBicycle = { id: string; qr_code_id: string; display_name: string; status: string; current_zone_id: string | null; last_latitude: number | null; last_longitude: number | null }
export type AdminZone = { id: string; name: string }
export type AdminProfile = { id: string; full_name: string | null; roll_number: string | null; role: string }
export type AdminReport = { id: string; bicycle_id: string; category: string; description: string; status: string; created_at: string }
export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type MaintenanceRecord = {
  id: string
  bicycle_id: string
  report_id: string | null
  assigned_to: string | null
  description: string
  status: MaintenanceStatus
  started_at: string | null
  completed_at: string | null
}
export type AdminRide = {
  id: string
  user_id: string
  bicycle_id: string
  status: string
  start_time: string
  end_time: string | null
  start_zone_id: string | null
  end_zone_id: string | null
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
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
    throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`)
  }
  if (response.status === 204) return null as T
  return response.json() as Promise<T>
}

export const adminApi = {
  bicycles: () => adminRequest<AdminBicycle[]>('/bicycles'),
  createBicycle: (body: { display_name: string; current_zone_id: string | null; status: string }) =>
    adminRequest<AdminBicycle>('/bicycles', { method: 'POST', body: JSON.stringify(body) }),
  updateBicycle: (id: string, body: { display_name?: string; current_zone_id?: string | null; status?: string }) =>
    adminRequest<AdminBicycle>(`/bicycles/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBicycle: (id: string) => adminRequest<void>(`/bicycles/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  zones: () => adminRequest<AdminZone[]>('/parking-zones?include_inactive=true'),
  profiles: () => adminRequest<AdminProfile[]>('/profiles'),
  rides: () => adminRequest<AdminRide[]>('/rides'),
  maintenance: () => adminRequest<MaintenanceRecord[]>('/maintenance-records'),
  createMaintenance: (body: { bicycle_id: string; description: string; report_id?: string; assigned_to?: string }) =>
    adminRequest<MaintenanceRecord>('/maintenance-records', { method: 'POST', body: JSON.stringify(body) }),
  updateMaintenanceStatus: (id: string, status: MaintenanceStatus, assignedTo?: string | null) =>
    adminRequest<MaintenanceRecord>(`/maintenance-records/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(assignedTo === undefined ? { status } : { status, assigned_to: assignedTo }),
    }),
  reports: () => adminRequest<AdminReport[]>('/reports'),
}

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback