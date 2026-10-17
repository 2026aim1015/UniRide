import type { Bicycle, ProblemReport, Ride } from '../types'

export const demoBicycles: Bicycle[] = [
  { id: 'B-001', label: 'Campus Cruiser', location: 'Central Library', distance: '2 min walk', status: 'Available', lastServiced: '12 Oct 2026', color: '#e0f1e8' },
  { id: 'B-023', label: 'Green Comet', location: 'Academic Block', distance: '3 min walk', status: 'Available', lastServiced: '10 Oct 2026', color: '#e4edff' },
  { id: 'B-047', label: 'Campus Loop', location: 'Near Hostel 5', distance: '5 min walk', status: 'In use', lastServiced: '08 Oct 2026', color: '#f8edd7' },
  { id: 'B-101', label: 'Quick Spin', location: 'Sports Complex', distance: '6 min walk', status: 'Available', lastServiced: '15 Oct 2026', color: '#f0e5f7' },
  { id: 'B-108', label: 'Hill Hopper', location: 'Mess', distance: '4 min walk', status: 'Maintenance', lastServiced: '16 Oct 2026', color: '#f8e5e2' },
  { id: 'B-120', label: 'Morning Ride', location: 'Library Parking Zone', distance: '7 min walk', status: 'Available', lastServiced: '11 Oct 2026', color: '#e5f1f4' },
]

export const demoRides: Ride[] = [
  { id: 'R-2408', bicycleId: 'B-023', startLocation: 'Central Library', endLocation: 'Academic Block', date: '16 Oct 2026 · 4:15 PM', duration: '18 min', distance: '1.8 km', status: 'Completed' },
  { id: 'R-2394', bicycleId: 'B-001', startLocation: 'Mess', endLocation: 'Library Parking Zone', date: '15 Oct 2026 · 11:30 AM', duration: '25 min', distance: '2.4 km', status: 'Completed' },
  { id: 'R-2377', bicycleId: 'B-101', startLocation: 'Hostel 5', endLocation: 'Sports Complex', date: '14 Oct 2026 · 6:05 PM', duration: '12 min', distance: '1.2 km', status: 'Completed' },
]

export const demoReports: ProblemReport[] = [
  { id: 'P-105', bicycleId: 'B-108', issue: 'Brake needs adjustment', location: 'Mess', status: 'Open', reportedAt: 'Today, 10:42 AM' },
  { id: 'P-104', bicycleId: 'B-047', issue: 'Flat tyre', location: 'Hostel 5', status: 'In progress', reportedAt: 'Yesterday, 5:15 PM' },
  { id: 'P-103', bicycleId: 'B-023', issue: 'Seat is loose', location: 'Academic Block', status: 'Resolved', reportedAt: '14 Oct 2026' },
]
