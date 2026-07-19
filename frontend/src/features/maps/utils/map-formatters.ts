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

function decodeEncodedPolyline(value?: string | null): LatLng[] {
  if (!value) return [];
  const points: LatLng[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  const decodeCoordinate = () => {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      if (index >= value.length) return null;
      byte = value.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return (result & 1) ? ~(result >> 1) : result >> 1;
  };

  while (index < value.length) {
    const latitudeDelta = decodeCoordinate();
    const longitudeDelta = decodeCoordinate();
    if (latitudeDelta == null || longitudeDelta == null) return [];
    latitude += latitudeDelta;
    longitude += longitudeDelta;
    points.push({ lat: latitude / 1e5, lon: longitude / 1e5 });
  }
  return points;
}

function sampleRoutePoints(points: LatLng[], maxPoints = 80): LatLng[] {
  if (points.length <= maxPoints) return points;
  const sampled = Array.from({ length: maxPoints }, (_, index) => {
    const sourceIndex = Math.round(index * (points.length - 1) / (maxPoints - 1));
    return points[sourceIndex];
  });
  return sampled;
}

function toPoints(route?: RouteOption | null): LatLng[] {
  const lines = route?.geometry?.coordinates;
  const geometryPoints = Array.isArray(lines) ? lines.flatMap((segment) =>
    Array.isArray(segment)
      ? segment
          .filter((point) => Array.isArray(point) && point.length >= 2)
          .map((point) => ({ lon: Number(point[0]), lat: Number(point[1]) }))
      : [],
  ) : [];
  const points = geometryPoints.length >= 2 ? geometryPoints : decodeEncodedPolyline(route?.polyline);
  return sampleRoutePoints(points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon)));
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

export function buildGoogleMapsDirectionsUrl(
  destinationAddress?: string | null,
  destinationCity?: string | null,
  origin?: { lat: number; lng: number } | null,
) {
  const address = destinationAddress?.trim() ?? '';
  const city = destinationCity?.trim() ?? '';
  const destination = city && !address.toLocaleLowerCase('pt-BR').includes(city.toLocaleLowerCase('pt-BR'))
    ? [address, city].filter(Boolean).join(', ')
    : address || city;
  if (!destination) return '';
  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
  });
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
