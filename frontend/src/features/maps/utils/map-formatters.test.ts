import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_GEOAPIFY_PUBLIC_KEY', 'test-map-key');
});

describe('admin map formatters', () => {
  it('renders Google encoded polylines through the configured static map integration', async () => {
    const { buildStaticRouteMapUrl } = await import('./map-formatters');
    const url = buildStaticRouteMapUrl({
      distanceMeters: 1000,
      durationSeconds: 600,
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      geometry: null,
    });

    expect(url).toContain('maps.geoapify.com/v1/staticmap');
    expect(url).toContain('geometry=polyline');
    expect(url).toContain('apiKey=test-map-key');
  });

  it('keeps origin and destination explicit without duplicating a city already in the address', async () => {
    const { buildGoogleMapsDirectionsUrl } = await import('./map-formatters');
    const url = new URL(buildGoogleMapsDirectionsUrl(
      'Rua Um, 10 - Centro - Itabirito/MG',
      'Itabirito',
      { lat: -20.25, lng: -43.8 },
    ));

    expect(url.searchParams.get('origin')).toBe('-20.25,-43.8');
    expect(url.searchParams.get('destination')).toBe('Rua Um, 10 - Centro - Itabirito/MG');
    expect(url.searchParams.get('travelmode')).toBe('driving');
  });
});
