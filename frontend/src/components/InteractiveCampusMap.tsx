import { useCallback, useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./InteractiveCampusMap.css";
import { supabase } from "../lib/supabase";

type Props = { compact?: boolean };

type ApiBicycle = {
  id: string;
  qr_code_id: string;
  display_name: string;
  status: "available" | "reserved" | "in_use" | "maintenance" | "offline" | string;
  current_zone_id: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
};

type ApiParkingZone = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
};

type LocatedBicycle = ApiBicycle & {
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  locationSource: "gps" | "zone";
};

const CAMPUS_CENTER: LatLngExpression = [30.96556, 76.47059];

// Approximate IIT Ropar campus viewing boundary (south-west and north-east).
// Adjust these four values if you have the exact campus perimeter coordinates.
const CAMPUS_SOUTH_WEST: [number, number] = [30.955, 76.455];
const CAMPUS_NORTH_EAST: [number, number] = [30.978, 76.486];
const CAMPUS_BOUNDS: LatLngBoundsExpression = [CAMPUS_SOUTH_WEST, CAMPUS_NORTH_EAST];

function isInsideCampus(position: [number, number]) {
  const [latitude, longitude] = position;
  return (
    latitude >= CAMPUS_SOUTH_WEST[0] &&
    latitude <= CAMPUS_NORTH_EAST[0] &&
    longitude >= CAMPUS_SOUTH_WEST[1] &&
    longitude <= CAMPUS_NORTH_EAST[1]
  );
}

const availableBikeIcon = L.divIcon({
  className: "uniride-bike-marker",
  html: '<div class="uniride-bike-pin available" aria-label="Available bicycle">🚲</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const unavailableBikeIcon = L.divIcon({
  className: "uniride-bike-marker",
  html: '<div class="uniride-bike-pin unavailable" aria-label="Unavailable bicycle">🚲</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FitMap() {
  const map = useMap();

  useEffect(() => {
    // Keep the map focused on IIT Ropar instead of following the student's GPS.
    map.setMaxBounds(CAMPUS_BOUNDS);
    map.fitBounds(CAMPUS_BOUNDS, { padding: [12, 12], maxZoom: 15 });
  }, [map]);

  return null;
}

// A permanent control lets users return to the campus view after zooming or panning.
function CampusMapControls() {
  const map = useMap();

  const resetCampusView = () => {
    map.fitBounds(CAMPUS_BOUNDS, {
      padding: [12, 12],
      maxZoom: 15,
      animate: true,
      duration: 0.5,
    });
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: "none" }}>
      <div className="leaflet-control" style={{ pointerEvents: "auto", marginTop: "10px", marginRight: "10px" }}>
        <button
          type="button"
          onClick={resetCampusView}
          aria-label="Return to IIT Ropar campus view"
          title="Return to IIT Ropar campus view"
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            background: "white",
            color: "#1e293b",
            padding: "9px 12px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 5px rgba(0,0,0,0.25)",
          }}
        >
          Reset Campus View
        </button>
      </div>
    </div>
  );
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number | null) {
  if (meters === null) return "Distance unavailable";
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(2)} km away`;
}

function formatLastSeen(value: string | null) {
  if (!value) return "Last location time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last location time unavailable";
  return `Location updated ${date.toLocaleString()}`;
}

export default function InteractiveCampusMap({ compact = false }: Props) {
  const [bicycles, setBicycles] = useState<ApiBicycle[]>([]);
  const [zones, setZones] = useState<ApiParkingZone[]>([]);
  const [studentPosition, setStudentPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  const loadMapData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Could not read login session: ${sessionError.message}`);
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in to view live bicycles and parking zones.");

      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
      const headers = { Authorization: `Bearer ${token}` };
      const [bicycleResponse, zoneResponse] = await Promise.all([
        fetch(`${baseUrl}/bicycles`, { headers }),
        fetch(`${baseUrl}/parking-zones`, { headers }),
      ]);

      if (!bicycleResponse.ok) {
        const body = await bicycleResponse.text();
        throw new Error(`Could not load bicycles (${bicycleResponse.status}): ${body}`);
      }
      if (!zoneResponse.ok) {
        const body = await zoneResponse.text();
        throw new Error(`Could not load parking zones (${zoneResponse.status}): ${body}`);
      }

      const [bicycleData, zoneData] = await Promise.all([
        bicycleResponse.json() as Promise<ApiBicycle[]>,
        zoneResponse.json() as Promise<ApiParkingZone[]>,
      ]);
      setBicycles(bicycleData);
      setZones(zoneData.filter((zone) => zone.is_active));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load live map data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMapData();
  }, [loadMapData]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support location. Distances are hidden.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPosition: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setStudentPosition(currentPosition);
        setLocationMessage(
          isInsideCampus(currentPosition)
            ? "Distances are measured from your current location."
            : "Your current location is outside the campus map area. The map remains focused on IIT Ropar."
        );
      },
      () => {
        setLocationMessage("Allow location access to see distances from you.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const locatedBicycles = useMemo<LocatedBicycle[]>(() => {
    return bicycles.flatMap((bicycle) => {
      let latitude = bicycle.last_latitude;
      let longitude = bicycle.last_longitude;
      let locationSource: LocatedBicycle["locationSource"] = "gps";

      if (latitude === null || longitude === null) {
        const zone = zones.find((candidate) => candidate.id === bicycle.current_zone_id);
        if (!zone) return [];
        latitude = zone.latitude;
        longitude = zone.longitude;
        locationSource = "zone";
      }

      return [{
        ...bicycle,
        latitude,
        longitude,
        locationSource,
        distanceMeters: studentPosition
          ? distanceMeters(studentPosition[0], studentPosition[1], latitude, longitude)
          : null,
      }];
    });
  }, [bicycles, zones, studentPosition]);

  const availableCount = bicycles.filter((bicycle) => bicycle.status === "available").length;
  const bikeIcon = (status: string) => status === "available" ? availableBikeIcon : unavailableBikeIcon;

  return (
    <section className="uniride-map-card">
      <div className="map-heading">
        <div>
          <p className="map-eyebrow">UNIRIDE / LIVE CAMPUS DATA</p>
          <h2>Find a bicycle</h2>
          <p className="map-subtitle">Bicycles and parking zones loaded from the UniRide backend.</p>
        </div>
        <button className="route-button map-refresh-button" onClick={() => void loadMapData(true)} disabled={loading || refreshing}>
          {refreshing ? "Refreshing…" : "Refresh map"}
        </button>
      </div>

      <div className="map-stats">
        <div className="map-stat"><span>Bicycles with location</span><strong>{locatedBicycles.length}</strong></div>
        <div className="map-stat"><span>Available bicycles</span><strong>{availableCount}</strong></div>
        <div className="map-stat"><span>Active parking zones</span><strong>{zones.length}</strong></div>
      </div>

      {loading && <p className="map-info" role="status">Loading bicycles and parking zones…</p>}
      {error && <div className="map-error" role="alert"><strong>Map data unavailable.</strong><p>{error}</p><button className="route-button" onClick={() => void loadMapData()}>Try again</button></div>}
      {!loading && !error && locatedBicycles.length === 0 && <p className="map-info">No bicycles have a usable GPS location or active parking-zone location yet.</p>}

      <p className="map-location-message">{locationMessage}</p>
      <div className="map-legend">
        <span><i className="legend-dot available" /> Available bicycle</span>
        <span><i className="legend-dot unavailable" /> Other bicycle status</span>
        <span><i className="legend-zone" /> Active parking-zone radius</span>
      </div>

      <div className="leaflet-map-shell">
        <MapContainer
          center={CAMPUS_CENTER}
          zoom={15}
          minZoom={14}
          maxZoom={20}
          maxBounds={CAMPUS_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom
          className={`leaflet-map-canvas ${compact ? "leaflet-map-compact" : ""}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMap />
          <CampusMapControls />

          {zones.map((zone) => (
            <Circle
              key={zone.id}
              center={[zone.latitude, zone.longitude]}
              radius={zone.radius_meters}
              pathOptions={{
                color: "#15803d",
                fillColor: "#22c55e",
                fillOpacity: 0.25,
                weight: 3,
                dashArray: "6 4",
              }}
            >
              <Tooltip direction="top" sticky className="parking-zone-tooltip">
                {zone.name} · Parking area
              </Tooltip>
              <Popup>
                <strong>{zone.name}</strong><br />
                Radius: {zone.radius_meters} m<br />
                Status: Active
              </Popup>
            </Circle>
          ))}

          {locatedBicycles.map((bicycle) => (
            <Marker key={bicycle.id} position={[bicycle.latitude, bicycle.longitude]} icon={bikeIcon(bicycle.status)}>
              <Popup>
                <strong>{bicycle.display_name}</strong><br />
                Status: {bicycle.status.replace(/_/g, " ")}<br />
                {formatDistance(bicycle.distanceMeters)}<br />
                {bicycle.locationSource === "gps" ? "GPS location" : "Approximate: current parking-zone centre"}<br />
                <small>{formatLastSeen(bicycle.last_location_at)}</small>
              </Popup>
            </Marker>
          ))}

          {studentPosition && isInsideCampus(studentPosition) && (
            <Marker position={studentPosition}>
              <Popup><strong>Your current location</strong></Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <p className="map-disclaimer">Bicycle positions use the last reported GPS location. If a bicycle has no GPS fix but is assigned to an active zone, its marker is shown at the zone centre and labelled approximate. Location permission is optional.</p>
    </section>
  );
}
