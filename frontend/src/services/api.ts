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
interface ApiRide {
  id: string
  user_id: string
  bicycle_id: string
  status: string
  start_time: string
  end_time: string | null
  start_latitude: number | null
  start_longitude: number | null
  end_latitude: number | null
  end_longitude: number | null
  start_zone_id: string | null
  end_zone_id: string | null
}

interface ApiReport {
  id: string
  bicycle_id: string
  reporter_id: string
  ride_id: string | null
  category: string
  description: string
  status: string
  created_at: string
}


interface RideCoordinates {
  latitude: number
  longitude: number
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
function convertRide(item: ApiRide): Ride {
  const formatLocation = (
    latitude: number | null,
    longitude: number | null,
    zoneId: string | null,
  ): string => {
    if (latitude !== null && longitude !== null) {
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    }

    if (zoneId) {
      return `Parking zone ${zoneId.slice(0, 8)}`
    }

    return 'Location not recorded'
  }

  return {
    id: item.id,
    bicycleId: item.bicycle_id,
    startLocation: formatLocation(
      item.start_latitude,
      item.start_longitude,
      item.start_zone_id,
    ),
    endLocation: formatLocation(
      item.end_latitude,
      item.end_longitude,
      item.end_zone_id,
    ),
    date: new Date(item.start_time).toLocaleString(),
    duration: 'Not calculated yet',
    distance: 'Not calculated yet',
    status:
      item.status === 'completed'
        ? 'Completed'
        : 'Active',
  }
}


function convertReport(item: ApiReport): ProblemReport {
  const statusMap: Record<string, ProblemReport['status']> = {
    open: 'Open',
    investigating: 'In progress',
    resolved: 'Resolved',
    rejected: 'Resolved',
  }

  return {
    id: item.id,
    bicycleId: item.bicycle_id,
    issue: item.category,
    location: 'Location not recorded',
    status: statusMap[item.status] ?? 'Open',
    reportedAt: new Date(item.created_at).toLocaleString(),
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
  const items = await request<ApiRide[]>('/rides/me')
  return items.map(convertRide)
},

  
 
async getReports(): Promise<ProblemReport[]> {
  if (USE_DEMO) return demoReports

  const items = await request<ApiReport[]>('/reports/me')
  return items.map(convertReport)
},


  async startRide(
  bicycleId: string,
  startLocation?: RideCoordinates,
): Promise<{ rideId: string; bicycleId: string }> {
  if (USE_DEMO) {
    throw new Error(
      'Demo mode is not supported for starting real rides.',
    )
  }

  const ride = await request<ApiRide>('/rides/start', {
    method: 'POST',
    body: JSON.stringify({
      bicycle_id: bicycleId,
      start_latitude: startLocation?.latitude ?? null,
      start_longitude: startLocation?.longitude ?? null,
    }),
  })

  return {
    rideId: ride.id,
    bicycleId: ride.bicycle_id,
  }
},

  async endRide(
  rideId: string,
  endLocation?: RideCoordinates,
): Promise<ApiRide> {
  if (USE_DEMO) {
    throw new Error(
      'Demo mode is not supported for ending real rides.',
    )
  }

  return request<ApiRide>(
    `/rides/${encodeURIComponent(rideId)}/end`,
    {
      method: 'POST',
      body: JSON.stringify({
        end_latitude: endLocation?.latitude ?? null,
        end_longitude: endLocation?.longitude ?? null,
      }),
    },
  )
},
async recordRideLocation(
  rideId: string,
  location: RideCoordinates,
): Promise<void> {
  if (USE_DEMO) {
    throw new Error(
      'Demo mode is not supported for GPS tracking.',
    )
  }

  await request(
    `/rides/${encodeURIComponent(rideId)}/locations`,
    {
      method: 'POST',
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
      }),
    },
  )
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
