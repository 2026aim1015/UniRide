export type BicycleStatus = 'Available' | 'In use' | 'Maintenance'
export type AppRole = 'student' | 'admin'

export interface Bicycle {
  id: string
  qrCodeId?: string
  label: string
  location: string
  lastUpdated: string
  zoneId: string | null
  status: BicycleStatus
  color: string
}

export interface Ride {
  id: string
  bicycleId: string
  startLocation: string
  endLocation: string
  date: string
  duration: string
  distance: string
  status: 'Completed' | 'Active'
}

export interface ProblemReport {
  id: string
  bicycleId: string
  issue: string
  description?: string
  location: string
  status: 'Open' | 'In progress' | 'Resolved' | 'Rejected'
  reportedAt: string
}

export interface UserProfile {
  id: string
  full_name: string | null
  roll_number: string | null
  role: AppRole
  account_status: 'active' | 'suspended'
  created_at: string
}

export interface RideCoordinates {
  latitude: number
  longitude: number
}

export interface ParkingZoneInfo {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
}

export interface ActiveRide {
  rideId: string
  bicycleId: string
  startedAt: number
}
