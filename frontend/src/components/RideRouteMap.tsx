import { memo, useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { RideCoordinates } from '../types'

const CAMPUS_CENTER: LatLngExpression = [30.96556, 76.47059]

function FitRoute({ points }: { points: RideCoordinates[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 17)
      return
    }
    const bounds: LatLngBoundsExpression = points.map(p => [p.latitude, p.longitude] as [number, number])
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 })
  }, [map, points])
  return null
}

function RideRouteMap({ points, height = 300 }: { points: RideCoordinates[]; height?: number }) {
  const line = useMemo(() => points.map(p => [p.latitude, p.longitude] as [number, number]), [points])
  const first = points[0]
  const last = points[points.length - 1]
  return (
    <div>
      <MapContainer center={CAMPUS_CENTER} zoom={16} scrollWheelZoom={false} style={{ height, width: '100%', borderRadius: 12 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitRoute points={points} />
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#16834a', weight: 5 }} />}
        {first && (
          <CircleMarker center={[first.latitude, first.longitude]} radius={8} pathOptions={{ color: '#16834a', fillColor: '#22c55e', fillOpacity: 1 }}>
            <Popup>Start</Popup>
          </CircleMarker>
        )}
        {last && points.length > 1 && (
          <CircleMarker center={[last.latitude, last.longitude]} radius={8} pathOptions={{ color: '#9c3f36', fillColor: '#ef4444', fillOpacity: 1 }}>
            <Popup>Latest position</Popup>
          </CircleMarker>
        )}
      </MapContainer>
      {points.length === 0 && <p className="muted-text" style={{ marginTop: 8 }}>No GPS points have been recorded for this ride yet.</p>}
    </div>
  )
}

export default memo(RideRouteMap)
