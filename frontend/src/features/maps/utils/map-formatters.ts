import { env } from "../../../lib/env";
import type { RouteOption } from "../../../types/route";

export function formatDistance(distanceMeters?: number | null) {
  if (!distanceMeters) return "-";
  const km = distanceMeters / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}

export function formatDuration(durationSeconds?: number | null) {
  if (!durationSeconds) return "-";
  const totalMinutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h`;
  return `${minutes} min`;
}

type LatLng = { lat: number; lon: number };

function toPoints(route?: RouteOption | null): LatLng[] {
  const lines = route?.geometry?.coordinates;
  if (!Array.isArray(lines) || lines.length === 0) return [];

  return lines.flatMap((segment) =>
    Array.isArray(segment)
      ? segment
          .filter((point) => Array.isArray(point) && point.length >= 2)
          .map((point) => ({ lon: Number(point[0]), lat: Number(point[1]) }))
      : [],
  );
}

function encodeMarker(point: LatLng, color: string) {
  return `lonlat:${point.lon},${point.lat};type:material;color:${color};size:medium;icon:location_on;icontype:material;whitecircle:no`;
}

function buildArea(points: LatLng[]) {
  const lons = points.map((point) => point.lon);
  const lats = points.map((point) => point.lat);

  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return `rect:${minLon},${maxLat},${maxLon},${minLat}`;
}

export function buildStaticRouteMapUrl(route?: RouteOption | null) {
  if (!env.geoapifyPublicKey) return "";

  const points = toPoints(route);
  if (points.length < 2) return "";

  const geometryValue = `polyline:${points.map((point) => `${point.lon},${point.lat}`).join(",")};linecolor:#2f7dcb;linewidth:4;lineopacity:0.9`;
  const params = new URLSearchParams({
    style: "osm-carto",
    width: "880",
    height: "360",
    area: buildArea(points),
    geometry: geometryValue,
    marker: `${encodeMarker(points[0], "#2f7dcb")}|${encodeMarker(points[points.length - 1], "#ff6c47")}`,
    apiKey: env.geoapifyPublicKey,
  });

  return `https://maps.geoapify.com/v1/staticmap?${params.toString()}`;
}


export function buildStaticPlaceMapUrl(latitude?: number | null, longitude?: number | null) {
  if (!env.geoapifyPublicKey) return "";
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";

  const params = new URLSearchParams({
    style: "osm-carto",
    width: "880",
    height: "360",
    center: `lonlat:${longitude},${latitude}`,
    zoom: "15",
    marker: encodeMarker({ lat: Number(latitude), lon: Number(longitude) }, "#ff6c47"),
    apiKey: env.geoapifyPublicKey,
  });

  return `https://maps.geoapify.com/v1/staticmap?${params.toString()}`;
}

export function buildMapsSearchUrl(addressLine?: string | null, city?: string | null) {
  const query = [addressLine, city].filter(Boolean).join(", ").trim();
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
