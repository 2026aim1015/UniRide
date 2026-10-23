import { demoBicycles, demoReports, demoRides } from '../data/demoData'
import type { Bicycle, ProblemReport, Ride } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const USE_DEMO = (import.meta.env.VITE_USE_DEMO_DATA ?? 'true') === 'true'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!response.ok) throw new Error(`API request failed (${response.status})`)
  return response.json() as Promise<T>
}

/**
 * Central service layer: components depend on these functions rather than fetch.
 * Demo mode can be replaced with FastAPI by setting VITE_USE_DEMO_DATA=false.
 */
export const api = {
  async getBicycles(): Promise<Bicycle[]> {
    if (USE_DEMO) return demoBicycles
    return request<Bicycle[]>('/bicycles')
  },
  async getRides(): Promise<Ride[]> {
    if (USE_DEMO) return demoRides
    return request<Ride[]>('/rides/me')
  },
  async getReports(): Promise<ProblemReport[]> {
    if (USE_DEMO) return demoReports
    return request<ProblemReport[]>('/reports')
  },
  async startRide(bicycleId: string): Promise<{ rideId: string; bicycleId: string }> {
    if (USE_DEMO) return { rideId: `DEMO-${Date.now()}`, bicycleId }
    return request('/rides/start', { method: 'POST', body: JSON.stringify({ bicycle_id: bicycleId }) })
  },
async endRide(rideId: string): Promise<{ ok: boolean }> {
  if (USE_DEMO) return { ok: true }

  await request(`/rides/${rideId}/end`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  return { ok: true }
},
  async submitReport(input: { bicycleId: string; issue: string; description: string }): Promise<{ ok: boolean }> {
    if (USE_DEMO) return { ok: true }
    return request('/reports', { method: 'POST', body: JSON.stringify({
      bicycle_id: input.bicycleId, issue_type: input.issue, description: input.description,
    }) })
  },
}
