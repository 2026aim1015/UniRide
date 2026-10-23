import { demoBicycles, demoReports, demoRides } from '../data/demoData'
import type { Bicycle, ProblemReport, Ride, UserProfile } from '../types'
import { supabase } from '../lib/supabase'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const USE_DEMO =
  (import.meta.env.VITE_USE_DEMO_DATA ?? 'false') === 'true'

interface ApiBicycle {
  id: string
  qr_code_id: string
  display_name: string
  status: string
  current_zone_id: string | null
  last_latitude: number | null
  last_longitude: number | null
  created_at: string
}

function convertBicycle(item: ApiBicycle): Bicycle {
  const statusMap: Record<string, Bicycle['status']> = {
    available: 'Available',
    in_use: 'In use',
    reserved: 'In use',
    maintenance: 'Maintenance',
    offline: 'Maintenance',
  }

  let location = 'Location not reported'

  if (item.last_latitude !== null && item.last_longitude !== null) {
    location = `${item.last_latitude.toFixed(5)}, ${item.last_longitude.toFixed(5)}`
  } else if (item.current_zone_id) {
    location = `Parking zone ${item.current_zone_id.slice(0, 8)}`
  }

  return {
    id: item.id,
    label: item.display_name,
    location,
    distance: 'Distance unavailable',
    status: statusMap[item.status] ?? 'Maintenance',
    lastServiced: 'Service history unavailable',
    color: item.status === 'available' ? '#e0f1e8' : '#f1f1ed',
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(`Could not read login session: ${error.message}`)
  }

  const token = data.session?.access_token

  if (!token) {
    throw new Error('Please sign in before loading bicycle data.')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`API request failed (${response.status}): ${message}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  // Always talks to the real backend (login is never faked, even in demo-data mode).
  async getMe(): Promise<UserProfile> {
    return request<UserProfile>('/profiles/me')
  },

  async getBicycles(): Promise<Bicycle[]> {
    if (USE_DEMO) return demoBicycles

    const items = await request<ApiBicycle[]>('/bicycles')
    return items.map(convertBicycle)
  },

  async getBicycle(bicycleId: string): Promise<Bicycle> {
    if (USE_DEMO) {
      const bike = demoBicycles.find(item => item.id === bicycleId)
      if (!bike) throw new Error('Bicycle not found')
      return bike
    }

    const item = await request<ApiBicycle>(
      `/bicycles/${encodeURIComponent(bicycleId)}`,
    )

    return convertBicycle(item)
  },

  async getRides(): Promise<Ride[]> {
    if (USE_DEMO) return demoRides
    return request<Ride[]>('/rides/me')
  },

  async getReports(): Promise<ProblemReport[]> {
    if (USE_DEMO) return demoReports
    return request<ProblemReport[]>('/reports')
  },

  async startRide(
    bicycleId: string,
  ): Promise<{ rideId: string; bicycleId: string }> {
    if (USE_DEMO) {
      return { rideId: `DEMO-${Date.now()}`, bicycleId }
    }

    return request('/rides/start', {
      method: 'POST',
      body: JSON.stringify({ bicycle_id: bicycleId }),
    })
  },

  async endRide(rideId: string): Promise<{ ok: boolean }> {
    if (USE_DEMO) return { ok: true }

    return request(`/rides/${rideId}/end`, { method: 'POST' })
  },

  async submitReport(input: {
    bicycleId: string
    issue: string
    description: string
  }): Promise<{ ok: boolean }> {
    if (USE_DEMO) return { ok: true }

    return request('/reports', {
      method: 'POST',
      body: JSON.stringify({
        bicycle_id: input.bicycleId,
        category: input.issue,
        description: input.description,
      }),
    })
  },
}
