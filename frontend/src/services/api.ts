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
interface ApiLocationEvent {
  id: string
  ride_id: string
  latitude: number
  longitude: number
  recorded_at: string
}

interface ApiParkingZone {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
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

const distanceBetweenMeters = (a: RideCoordinates, b: RideCoordinates): number => {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const lat1 = radians(a.latitude)
  const lat2 = radians(b.latitude)
  const deltaLat = radians(b.latitude - a.latitude)
  const deltaLon = radians(b.longitude - a.longitude)
  const h = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
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
    qrCodeId: item.qr_code_id,
    label: item.display_name,
    location,
    distance: 'Distance unavailable',
    status: statusMap[item.status] ?? 'Maintenance',
    lastServiced: 'Service history unavailable',
    color: item.status === 'available' ? '#e0f1e8' : '#f1f1ed',
  }
}
function convertRide(item: ApiRide): Ride {
  const calculateDuration = (
  startTime: string,
  endTime: string | null,
): string => {
  if (!endTime) return 'In progress'

  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 'Unavailable'
  }

  const totalMinutes = Math.floor((end - start) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours} hr ${minutes} min`
  }

  return `${minutes} min`
}
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
    duration: calculateDuration(item.start_time, item.end_time),
    distance: 'GPS data unavailable',
    status:
      item.status === 'completed'
        ? 'Completed'
        : 'Active',
  }
}
const calculateRideDistance = (
  points: ApiLocationEvent[],
  ride: ApiRide,
): string => {
  let coordinates: RideCoordinates[]

  // First preference: actual GPS tracking points.
  if (points.length >= 2) {
    coordinates = [...points]
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      )
      .map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
      }))
  } else {
    // Fallback: ride start and end coordinates.
    if (
      ride.start_latitude === null ||
      ride.start_longitude === null ||
      ride.end_latitude === null ||
      ride.end_longitude === null
    ) {
      return 'GPS data unavailable'
    }

    coordinates = [
      {
        latitude: ride.start_latitude,
        longitude: ride.start_longitude,
      },
      {
        latitude: ride.end_latitude,
        longitude: ride.end_longitude,
      },
    ]
  }

  let totalMeters = 0

  for (let i = 1; i < coordinates.length; i++) {
    totalMeters += distanceBetweenMeters(
      coordinates[i - 1],
      coordinates[i],
    )
  }

  if (totalMeters < 1000) {
    return `${Math.round(totalMeters)} m`
  }

  return `${(totalMeters / 1000).toFixed(2)} km`
}

function convertReport(item: ApiReport): ProblemReport {
  const statusMap: Record<string, ProblemReport['status']> = {
    open: 'Open',
    investigating: 'In progress',
    resolved: 'Resolved',
    rejected: 'Rejected',
  }

  return {
    id: item.id,
    bicycleId: item.bicycle_id,
    issue: item.category,
    description: item.description,
    location: 'Location not recorded',
    status: statusMap[item.status] ?? 'Open',
    reportedAt: new Date(item.created_at).toLocaleString(),
  }
}

const reportStatusToApi: Record<ProblemReport['status'], string> = {
  Open: 'open',
  'In progress': 'investigating',
  Resolved: 'resolved',
  Rejected: 'rejected',
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

async function findParkingZone(location: RideCoordinates): Promise<string> {
  const zones = await request<ApiParkingZone[]>('/parking-zones')
  const eligible = zones
    .filter(zone => zone.is_active)
    .map(zone => ({
      zone,
      distance: distanceBetweenMeters(location, {
        latitude: zone.latitude,
        longitude: zone.longitude,
      }),
    }))
    .filter(item => item.distance <= item.zone.radius_meters)
    .sort((a, b) => a.distance - b.distance)

  if (!eligible.length) {
    throw new Error('You must be inside an active parking zone to start or end a ride.')
  }

  return eligible[0].zone.id
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

  return Promise.all(
    items.map(async (item) => {
      let points: ApiLocationEvent[] = []

      try {
        points = await api.getRideLocations(item.id)
      } catch (error) {
        console.error(
          `Could not load GPS points for ride ${item.id}:`,
          error,
        )
      }

      return {
        ...convertRide(item),
        distance: calculateRideDistance(points, item),
      }
    }),
  )
},
async getRideLocations(rideId: string): Promise<ApiLocationEvent[]> {
  return request<ApiLocationEvent[]>(
    `/rides/${encodeURIComponent(rideId)}/locations`,
  )
},

  
 
async getReports(): Promise<ProblemReport[]> {
  if (USE_DEMO) return demoReports

  const items = await request<ApiReport[]>('/reports/me')
  return items.map(convertReport)
},
async getAllReports(): Promise<ProblemReport[]> {
  // Admin only: every report from every student.
  if (USE_DEMO) return demoReports
  const items = await request<ApiReport[]>('/reports')
  return items.map(convertReport)
},
async updateReportStatus(
  reportId: string,
  status: ProblemReport['status'],
): Promise<ProblemReport> {
  if (USE_DEMO) {
    throw new Error('Demo mode is not supported for updating reports.')
  }
  const item = await request<ApiReport>(
    `/reports/${encodeURIComponent(reportId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: reportStatusToApi[status] }),
    },
  )
  return convertReport(item)
},


  async startRide(
    bicycleId: string,
    startLocation: RideCoordinates,
  ): Promise<{ rideId: string; bicycleId: string }> {
    if (USE_DEMO) {
      throw new Error('Demo mode is not supported for starting real rides.')
    }

    const startZoneId = await findParkingZone(startLocation)
    const ride = await request<ApiRide>('/rides/start', {
      method: 'POST',
      body: JSON.stringify({
        bicycle_id: bicycleId,
        start_latitude: startLocation.latitude,
        start_longitude: startLocation.longitude,
        start_zone_id: startZoneId,
      }),
    })

    return { rideId: ride.id, bicycleId: ride.bicycle_id }
  },

  async endRide(
    rideId: string,
    endLocation: RideCoordinates,
  ): Promise<ApiRide> {
    if (USE_DEMO) {
      throw new Error('Demo mode is not supported for ending real rides.')
    }

    const endZoneId = await findParkingZone(endLocation)
    // Save the final point before closing the ride; completed rides reject location events.
    await api.recordRideLocation(rideId, endLocation)

    return request<ApiRide>(
      `/rides/${encodeURIComponent(rideId)}/end`,
      {
        method: 'POST',
        body: JSON.stringify({
          end_latitude: endLocation.latitude,
          end_longitude: endLocation.longitude,
          end_zone_id: endZoneId,
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
  }): Promise<void> {
    if (USE_DEMO) {
  throw new Error('Report submission requires real backend mode.')
   }
    await request<ApiReport>('/reports', {
      method: 'POST',
      body: JSON.stringify({
        bicycle_id: input.bicycleId,
        category: input.issue,
        description: input.description,
      }),
    })
  },
}
