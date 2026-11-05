import type { ActiveRide, Bicycle, ParkingZoneInfo, ProblemReport, Ride, RideCoordinates, UserProfile } from '../types'
import { supabase } from '../lib/supabase'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

interface ApiBicycle {
  id: string
  qr_code_id: string
  display_name: string
  status: string
  current_zone_id: string | null
  last_latitude: number | null
  last_longitude: number | null
  last_location_at: string | null
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
export interface ApiLocationEvent {
  id: string
  ride_id: string
  latitude: number
  longitude: number
  recorded_at: string
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

function convertBicycle(item: ApiBicycle, zoneNames: Map<string, string>): Bicycle {
  const statusMap: Record<string, Bicycle['status']> = {
    available: 'Available',
    in_use: 'In use',
    reserved: 'In use',
    maintenance: 'Maintenance',
    offline: 'Maintenance',
  }

  let location = 'Location not reported'
  const zoneName = item.current_zone_id ? zoneNames.get(item.current_zone_id) : undefined
  if (zoneName) {
    location = zoneName
  } else if (item.last_latitude !== null && item.last_longitude !== null) {
    location = `${item.last_latitude.toFixed(5)}, ${item.last_longitude.toFixed(5)}`
  }

  return {
    id: item.id,
    qrCodeId: item.qr_code_id,
    label: item.display_name,
    location,
    zoneId: item.current_zone_id,
    lastUpdated: item.last_location_at
      ? new Date(item.last_location_at).toLocaleString()
      : 'No location update yet',
    status: statusMap[item.status] ?? 'Maintenance',
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
    distance: 'No GPS data',
    status:
      item.status === 'completed'
        ? 'Completed'
        : 'Active',
  }
}
export const pathLengthMeters = (points: RideCoordinates[]): number => {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distanceBetweenMeters(points[i - 1], points[i])
  return total
}

export const formatDistanceMeters = (meters: number): string =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(2)} km`

const calculateRideDistance = (points: ApiLocationEvent[]): string => {
  if (points.length < 2) {
    return 'No GPS data'
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadiusMeters = 6371000
  let totalMeters = 0

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]
    const current = points[i]

    const lat1 = toRadians(previous.latitude)
    const lat2 = toRadians(current.latitude)
    const deltaLat = toRadians(current.latitude - previous.latitude)
    const deltaLon = toRadians(current.longitude - previous.longitude)

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) ** 2

    const safeA = Math.min(1, Math.max(0, a))
    const c = 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA))
    totalMeters += earthRadiusMeters * c
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
    const body = await response.json().catch(() => null)
    const detail = body && typeof body.detail === 'string' ? body.detail : ''
    throw new Error(detail || `Request failed (${response.status}). Please try again.`)
  }

  return response.json() as Promise<T>
}

async function findParkingZone(location: RideCoordinates): Promise<string> {
  const zones = await request<ParkingZoneInfo[]>('/parking-zones')
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
  async getMe(): Promise<UserProfile> {
    return request<UserProfile>('/profiles/me')
  },

  async getParkingZones(): Promise<ParkingZoneInfo[]> {
    return request<ParkingZoneInfo[]>('/parking-zones')
  },

  async getBicycles(): Promise<Bicycle[]> {
    const [items, zones] = await Promise.all([
      request<ApiBicycle[]>('/bicycles'),
      request<ParkingZoneInfo[]>('/parking-zones?include_inactive=true').catch(() => [] as ParkingZoneInfo[]),
    ])
    const zoneNames = new Map(zones.map(zone => [zone.id, zone.name]))
    // Offline bicycles are deactivated: keep them in admin management, not the student catalogue.
    return items.filter(item => item.status !== 'offline').map(item => convertBicycle(item, zoneNames))
  },

  async getBicycle(bicycleId: string): Promise<Bicycle> {
    const [item, zones] = await Promise.all([
      request<ApiBicycle>(`/bicycles/${encodeURIComponent(bicycleId)}`),
      request<ParkingZoneInfo[]>('/parking-zones?include_inactive=true').catch(() => [] as ParkingZoneInfo[]),
    ])
    return convertBicycle(item, new Map(zones.map(zone => [zone.id, zone.name])))
  },

  // The rider's unfinished ride (if any), so it can be restored after a refresh.
  async getActiveRide(): Promise<ActiveRide | null> {
    const ride = await request<ApiRide | null>('/rides/me/active')
    if (!ride) return null
    return { rideId: ride.id, bicycleId: ride.bicycle_id, startedAt: new Date(ride.start_time).getTime() }
  },

  async getRides(): Promise<Ride[]> {

  const items = await request<ApiRide[]>('/rides/me')

  return Promise.all(
    items.map(async (item) => {
      const points = await api.getRideLocations(item.id)

      return {
        ...convertRide(item),
        distance: calculateRideDistance(points),
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

  const items = await request<ApiReport[]>('/reports/me')
  return items.map(convertReport)
},
async getAllReports(): Promise<ProblemReport[]> {
  // Admin only: every report from every student.
  const items = await request<ApiReport[]>('/reports')
  return items.map(convertReport)
},
async updateReportStatus(
  reportId: string,
  status: ProblemReport['status'],
): Promise<ProblemReport> {
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
