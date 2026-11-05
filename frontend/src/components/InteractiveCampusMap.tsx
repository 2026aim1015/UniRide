import { useCallback, useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./InteractiveCampusMap.css";
import { supabase } from "../lib/supabase";

type Props = { compact?: boolean; refreshKey?: number };

const AUTO_REFRESH_MS = 30000;

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

type ZoneSummary = ApiParkingZone & {
  bicycles: ApiBicycle[];
  available: number;
  inUse: number;
  maintenance: number;
  other: number;
  distanceMeters: number | null;
};

const CAMPUS_CENTER: LatLngExpression = [30.96556, 76.47059];

function markerSizeForZoom(zoom: number) {
  if (zoom < 14) return 14;
  if (zoom < 17) return 19;
  return 24;
}

function makeZoneIcon(available: number, selected: boolean, size: number) {
  const fontSize = size <= 14 ? 9 : size <= 19 ? 11 : 13;
  const statusClass = available > 0 ? "available" : "unavailable";

  return L.divIcon({
    className: "uniride-zone-marker",
    html: `<div class="uniride-zone-count ${statusClass}${selected ? " selected" : ""}" style="--zone-marker-size:${size}px;--zone-marker-font:${fontSize}px" aria-label="${available} available bicycles"><strong>${available}</strong></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function groupZonesForZoom(zones: ZoneSummary[], zoom: number) {
  if (zoom >= 17 || zones.length < 2) {
    return zones.map((zone) => ({
      id: zone.id,
      latitude: zone.latitude,
      longitude: zone.longitude,
      available: zone.available,
      zones: [zone],
    }));
  }

  const threshold = zoom < 14 ? 48 : 40;
  const projected = zones.map((zone) => ({ zone }));
  const groups: Array<{ zones: ZoneSummary[]; x: number; y: number }> = [];

  for (const item of projected) {
    const point = L.CRS.EPSG3857.project(L.latLng(item.zone.latitude, item.zone.longitude));
    const scale = 256 * 2 ** zoom / (2 * Math.PI * 6378137);
    const x = point.x * scale;
    const y = point.y * scale;
    const nearby = groups.find((group) => {
      const centerX = group.x / group.zones.length;
      const centerY = group.y / group.zones.length;
      return Math.hypot(x - centerX, y - centerY) <= threshold;
    });

    if (nearby) {
      nearby.zones.push(item.zone);
      nearby.x += x;
      nearby.y += y;
    } else {
      groups.push({ zones: [item.zone], x, y });
    }
  }

  return groups.map((group) => ({
    id: group.zones.map((zone) => zone.id).join("-"),
    latitude: group.zones.reduce((sum, zone) => sum + zone.latitude, 0) / group.zones.length,
    longitude: group.zones.reduce((sum, zone) => sum + zone.longitude, 0) / group.zones.length,
    available: group.zones.reduce((sum, zone) => sum + zone.available, 0),
    zones: group.zones,
  }));
}

function ParkingZoneMarkers({
  zones,
  selectedZoneId,
  onSelect,
}: {
  zones: ZoneSummary[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => setZoom(map.getZoom());
    map.on("zoomend", updateZoom);
    map.on("moveend", updateZoom);
    return () => {
      map.off("zoomend", updateZoom);
      map.off("moveend", updateZoom);
    };
  }, [map]);

  const groups = useMemo(() => groupZonesForZoom(zones, zoom), [zones, zoom]);
  const markerSize = markerSizeForZoom(zoom);

  return <>
    {groups.map((group) => {
      const isSelected = group.zones.some((zone) => zone.id === selectedZoneId);
      const isCluster = group.zones.length > 1;
      return (
        <Marker
          key={group.id}
          position={[group.latitude, group.longitude]}
          icon={makeZoneIcon(group.available, isSelected, markerSize)}
          eventHandlers={{
            click: () => {
              if (isCluster) {
                map.flyTo([group.latitude, group.longitude], Math.min(map.getZoom() + 2, 18), { duration: 0.45 });
              } else {
                onSelect(group.zones[0].id);
              }
            },
          }}
        >
          <Popup>
            {isCluster ? (
              <><strong>{group.zones.length} nearby parking locations</strong><br />{group.available} available bicycles<br /><small>Zoom in to choose a location.</small></>
            ) : (
              <><strong>{group.zones[0].name}</strong><br />{group.zones[0].available} available bicycles<br />{group.zones[0].inUse} in use · {group.zones[0].maintenance} maintenance</>
            )}
          </Popup>
        </Marker>
      );
    })}
  </>;
}

const gpsBikeIcon = L.divIcon({
  className: "uniride-gps-marker",
  html: '<div class="uniride-gps-dot" aria-label="Bicycle GPS location"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapFocus({
  studentPosition,
  selectedZone,
}: {
  studentPosition: [number, number] | null;
  selectedZone: ApiParkingZone | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedZone) {
      map.flyTo([selectedZone.latitude, selectedZone.longitude], 18, { duration: 0.5 });
    } else if (studentPosition) {
      map.setView(studentPosition, 16);
    } else {
      map.setView(CAMPUS_CENTER, 16);
    }
  }, [map, studentPosition, selectedZone]);

  return null;
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

export default function InteractiveCampusMap({ compact = false, refreshKey = 0 }: Props) {
  const [bicycles, setBicycles] = useState<ApiBicycle[]>([]);
  const [zones, setZones] = useState<ApiParkingZone[]>([]);
  const [studentPosition, setStudentPosition] = useState<[number, number] | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
      setLastUpdated(new Date());
      setZones(zoneData.filter((zone) => zone.is_active));
      setSelectedZoneId((current) =>
        current && zoneData.some((zone) => zone.id === current && zone.is_active)
          ? current
          : null,
      );
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

  // Reload straight away when the parent says something changed (a ride started or ended).
  useEffect(() => {
    if (refreshKey > 0) void loadMapData(true);
  }, [refreshKey, loadMapData]);

  // Keep availability fresh without a manual reload: poll while the tab is visible.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadMapData(true);
    }, AUTO_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadMapData(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadMapData]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support location. Distances are hidden.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStudentPosition([position.coords.latitude, position.coords.longitude]);
        setLocationMessage("Distances are measured from your current location.");
      },
      () => setLocationMessage("Allow location access to see distances from you."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const zoneSummaries = useMemo<ZoneSummary[]>(() => {
    return zones
      .map((zone) => {
        const zoneBicycles = bicycles.filter((bicycle) => bicycle.current_zone_id === zone.id);
        return {
          ...zone,
          bicycles: zoneBicycles,
          available: zoneBicycles.filter((bicycle) => bicycle.status === "available").length,
          inUse: zoneBicycles.filter((bicycle) => bicycle.status === "in_use").length,
          maintenance: zoneBicycles.filter((bicycle) => bicycle.status === "maintenance").length,
          other: zoneBicycles.filter(
            (bicycle) => !["available", "in_use", "maintenance"].includes(bicycle.status),
          ).length,
          distanceMeters: studentPosition
            ? distanceMeters(
                studentPosition[0],
                studentPosition[1],
                zone.latitude,
                zone.longitude,
              )
            : null,
        };
      })
      .sort((a, b) => {
        if (a.distanceMeters === null || b.distanceMeters === null) {
          return a.name.localeCompare(b.name);
        }
        return a.distanceMeters - b.distanceMeters;
      });
  }, [bicycles, zones, studentPosition]);

  const selectedZone = zoneSummaries.find((zone) => zone.id === selectedZoneId) ?? null;
  const availableCount = bicycles.filter((bicycle) => bicycle.status === "available").length;
  const inUseCount = bicycles.filter((bicycle) => bicycle.status === "in_use").length;
  const maintenanceCount = bicycles.filter((bicycle) => bicycle.status === "maintenance").length;

  // Keep genuine GPS markers when a bicycle has no assigned zone or its last
  // GPS point is outside the assigned zone radius. Bikes parked within a zone
  // are represented by that zone's aggregated count marker to avoid clutter.
  const gpsBicyclesOutsideZone = bicycles.filter((bicycle) => {
    if (bicycle.last_latitude === null || bicycle.last_longitude === null) return false;
    const assignedZone = zones.find((zone) => zone.id === bicycle.current_zone_id);
    if (!assignedZone) return true;
    return (
      distanceMeters(
        assignedZone.latitude,
        assignedZone.longitude,
        bicycle.last_latitude,
        bicycle.last_longitude,
      ) > assignedZone.radius_meters
    );
  });

  return (
    <section className="uniride-map-card">
      <div className="map-heading">
        <div>
          <p className="map-eyebrow">UNIRIDE / LIVE CAMPUS DATA</p>
          <h2>Find a bicycle</h2>
          <p className="map-subtitle">Explore parking locations and check bicycle availability.</p>
        </div>
        <button
          className="route-button map-refresh-button"
          onClick={() => void loadMapData(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? "Refreshing…" : lastUpdated ? `Refresh · updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh map"}
        </button>
      </div>

      <div className="map-stats">
        <div className="map-stat"><span>Available</span><strong>{availableCount}</strong></div>
        <div className="map-stat"><span>In use</span><strong>{inUseCount}</strong></div>
        <div className="map-stat"><span>Maintenance</span><strong>{maintenanceCount}</strong></div>
      </div>

      {loading && <p className="map-info" role="status">Loading bicycles and parking zones…</p>}
      {error && (
        <div className="map-error" role="alert">
          <strong>Map data unavailable.</strong>
          <p>{error}</p>
          <button className="route-button" onClick={() => void loadMapData()}>Try again</button>
        </div>
      )}
      {!loading && !error && zoneSummaries.length === 0 && (
        <p className="map-info">No active parking zones are available yet.</p>
      )}

      <p className="map-location-message">{locationMessage}</p>

      <div className={`campus-map-layout${compact ? " campus-map-layout-compact" : ""}`}>
        <div className="leaflet-map-shell">
          <MapContainer
            center={CAMPUS_CENTER}
            zoom={16}
            minZoom={13}
            maxZoom={20}
            scrollWheelZoom
            className={`leaflet-map-canvas ${compact ? "leaflet-map-compact" : ""}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFocus studentPosition={studentPosition} selectedZone={selectedZone} />

            {zoneSummaries.map((zone) => (
              <Circle
                key={`radius-${zone.id}`}
                center={[zone.latitude, zone.longitude]}
                radius={zone.radius_meters}
                pathOptions={{
                  color: zone.id === selectedZoneId ? "#315C85" : "#16834a",
                  fillColor: zone.id === selectedZoneId ? "#6EA4D0" : "#22c55e",
                  fillOpacity: zone.id === selectedZoneId ? 0.16 : 0.07,
                  weight: zone.id === selectedZoneId ? 2 : 1,
                }}
              />
            ))}

            <ParkingZoneMarkers
              zones={zoneSummaries}
              selectedZoneId={selectedZoneId}
              onSelect={setSelectedZoneId}
            />

            {gpsBicyclesOutsideZone.map((bicycle) => (
              <Marker
                key={bicycle.id}
                position={[bicycle.last_latitude as number, bicycle.last_longitude as number]}
                icon={gpsBikeIcon}
              >
                <Popup>
                  <strong>{bicycle.display_name}</strong><br />
                  Status: {bicycle.status.replace(/_/g, " ")}<br />
                  GPS location<br />
                  <small>{formatLastSeen(bicycle.last_location_at)}</small>
                </Popup>
              </Marker>
            ))}

            {studentPosition && (
              <Marker position={studentPosition}>
                <Popup><strong>Your current location</strong></Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <aside className="parking-location-panel" aria-label="Campus parking locations">
          <div className="parking-panel-heading">
            <div>
              <h3>Parking locations</h3>
              <p>Select a location to see its bicycle counts.</p>
            </div>
            <span className="parking-zone-total">{zoneSummaries.length}</span>
          </div>

          {zoneSummaries.length === 0 ? (
            <p className="map-info">No active parking locations to show.</p>
          ) : (
            <div className="parking-location-list">
              {zoneSummaries.map((zone) => (
                <button
                  type="button"
                  key={zone.id}
                  className={`parking-location-card${zone.id === selectedZoneId ? " selected" : ""}`}
                  onClick={() => setSelectedZoneId(zone.id)}
                  aria-pressed={zone.id === selectedZoneId}
                >
                  <span className="parking-card-main">
                    <strong>{zone.name}</strong>
                    <small>{formatDistance(zone.distanceMeters)}</small>
                  </span>
                  <span className="parking-card-availability">
                    <strong>{zone.available}</strong>
                    <small>available</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedZone && (
            <div className="selected-zone-details" aria-live="polite">
              <p className="selected-zone-eyebrow">SELECTED PARKING LOCATION</p>
              <h3>{selectedZone.name}</h3>
              <p className="selected-zone-distance">{formatDistance(selectedZone.distanceMeters)}</p>
              <div className="zone-status-counts">
                <div className="zone-status-count available-count">
                  <strong>{selectedZone.available}</strong>
                  <span>Available</span>
                </div>
                <div className="zone-status-count in-use-count">
                  <strong>{selectedZone.inUse}</strong>
                  <span>In use</span>
                </div>
                <div className="zone-status-count maintenance-count">
                  <strong>{selectedZone.maintenance}</strong>
                  <span>Maintenance</span>
                </div>
              </div>
              {selectedZone.other > 0 && (
                <p className="zone-other-count">
                  {selectedZone.other} other {selectedZone.other === 1 ? "bicycle" : "bicycles"} (reserved/offline)
                </p>
              )}
              <p className="zone-radius-note">Parking-zone radius: {selectedZone.radius_meters} m</p>
            </div>
          )}
        </aside>
      </div>

      <div className="map-legend map-legend-clean">
        <span><i className="legend-count available-legend" /> Number = available bicycles</span>
        <span><i className="legend-zone" /> Parking-zone radius</span>
        <span><i className="legend-gps" /> Bicycle GPS outside a zone</span>
      </div>
      <p className="map-disclaimer">
        Parking-location counts are calculated from the latest bicycle records returned by the backend. A bicycle assigned to a parking zone is represented by that zone's count. Bicycles with GPS positions outside their assigned parking-zone radius appear separately on the map. Location permission is optional.
      </p>
    </section>
  );
}
