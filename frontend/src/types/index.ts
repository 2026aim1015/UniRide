export type BicycleStatus = 'Available' | 'In use' | 'Maintenance'
export type AppRole = 'student' | 'admin'

export interface Bicycle {
  id: string
  label: string
  location: string
  distance: string
  status: BicycleStatus
  battery?: string
  lastServiced: string
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
  location: string
  status: 'Open' | 'In progress' | 'Resolved'
  reportedAt: string
}
