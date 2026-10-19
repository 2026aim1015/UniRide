
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./InteractiveCampusMap.css";

import { campusStations } from "../data/stations";
import L from "leaflet";
import { Marker } from "react-leaflet";
const bicycleIcon = L.divIcon({
  className: "bicycle-map-marker",
  html: `
    <div class="bicycle-pin">
      <span>🚲</span>
    </div>
  `,
  iconSize: [28, 32],
iconAnchor: [14, 32],
popupAnchor: [0, -30],
});
type Props = {
  compact?: boolean;
};

type RouteResponse = {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
    };
  }[];
};

function FitStations() {
  const map = useMap();

  useEffect(() => {
    // Focus the map on IIT Ropar's permanent campus area.
    // This is the campus reference point, not a station location.
    map.setView([30.96556, 76.47059], 16);
  }, [map]);

  return null;
}

export default function InteractiveCampusMap({
  compact = false,
}: Props) {
  const activeStations = useMemo(
    () => campusStations.filter((station) => station.status === "active"),
    []
  );

  const [startId, setStartId] = useState(
    activeStations[0] ? String(activeStations[0].id) : ""
  );

  const [endId, setEndId] = useState(
    activeStations[1]
      ? String(activeStations[1].id)
      : ""
  );

  const [routePoints, setRoutePoints] = useState<LatLngExpression[]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);
  const [routeError, setRouteError] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(false);

  const totalBikes = campusStations.reduce(
    (sum, station) => sum + station.availableBicycles,
    0
  );

  const startStation = campusStations.find(
    (station) => String(station.id) === startId
  );

  const endStation = campusStations.find(
    (station) => String(station.id) === endId
  );

  async function findRoute() {
    if (!startStation || !endStation) {
      setRouteError("Select both a starting station and a destination.");
      return;
    }

    if (startStation.id === endStation.id) {
      setRouteError("Choose two different stations.");
      return;
    }

    setLoadingRoute(true);
    setRouteError("");
    setRoutePoints([]);
    setRouteInfo(null);

    try {
      const start = `${startStation.longitude},${startStation.latitude}`;
      const end = `${endStation.longitude},${endStation.latitude}`;

      const url =
        `https://router.project-osrm.org/route/v1/foot/` +
        `${start};${end}?overview=full&geometries=geojson`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("The routing service is unavailable.");
      }

      const data: RouteResponse = await response.json();
      const route = data.routes?.[0];

      if (data.code !== "Ok" || !route) {
        throw new Error("No route was found between these points.");
      }

      setRoutePoints(
        route.geometry.coordinates.map(
          ([longitude, latitude]) =>
            [latitude, longitude] as LatLngExpression
        )
      );

      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
      });
    } catch {
      setRouteError(
        "Could not load the route. Check your internet connection and try again."
      );
    } finally {
      setLoadingRoute(false);
    }
  }

  return (
    <section className="uniride-map-card">
      <div className="map-heading">
        <div>
          <p className="map-eyebrow">UNIRIDE / CAMPUS</p>
          <h2>Find a bicycle</h2>
          <p className="map-subtitle">
            Explore stations and plan a route.
          </p>
        </div>
        <span className="demo-label">Demo data</span>
      </div>

      <div className="map-stats">
        <div className="map-stat">
          <span>Stations</span>
          <strong>{campusStations.length}</strong>
        </div>
        <div className="map-stat">
          <span>Bikes available</span>
          <strong>{totalBikes}</strong>
        </div>
        <div className="map-stat">
          <span>Active stations</span>
          <strong>{activeStations.length}</strong>
        </div>
      </div>

      <div className="route-controls">
        <label>
          Start station
          <select
            value={startId}
            onChange={(event) => setStartId(event.target.value)}
          >
            {activeStations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Destination
          <select
            value={endId}
            onChange={(event) => setEndId(event.target.value)}
          >
            {activeStations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </label>

        <button
          className="route-button"
          onClick={findRoute}
          disabled={loadingRoute || activeStations.length < 2}
        >
          {loadingRoute ? "Finding route..." : "Find route"}
        </button>
      </div>

      {routeInfo && (
        <div className="route-result">
          <strong>
            {(routeInfo.distance / 1000).toFixed(2)} km
          </strong>
          <span>
            Approx. {Math.max(1, Math.round(routeInfo.duration / 60))} min
            walking
          </span>
        </div>
      )}

      {routeError && (
        <p className="route-error" role="status">
          {routeError}
        </p>
      )}

      <div className="map-legend">
        <span><i className="legend-dot available" /> Active station</span>
        <span><i className="legend-dot unavailable" /> Inactive station</span>
        <span><i className="legend-line" /> Selected route</span>
      </div>

      <div className="leaflet-map-shell">
        <MapContainer
          center={[30.96556, 76.47059]}
        
        
          zoom={16}
          minZoom={14}
          maxZoom={19}
          scrollWheelZoom
          className={`leaflet-map-canvas ${
            compact ? "leaflet-map-compact" : ""
          }`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitStations />

          {campusStations.map((station) => {
            

            return (
              <Marker
  key={station.id}
  position={[station.latitude, station.longitude]}
  icon={bicycleIcon}
>
  <Popup>
    <strong>{station.name}</strong>
    <br />
    Available bicycles: {station.availableBicycles}
  </Popup>
     </Marker>
            );
          })}

          {routePoints.length > 0 && (
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: "#16834a",
                weight: 5,
                opacity: 0.9,
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="map-disclaimer">
        Station coordinates and bicycle counts are illustrative demo data.
        Verify campus locations before using this map for real navigation.
        Routes depend on the external OpenStreetMap routing service and
        may not represent verified campus walking paths.
      </p>
    </section>
  );
}
