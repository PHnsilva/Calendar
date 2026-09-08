// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const admin = {
  id: 'admin-1',
  name: 'Admin',
  phone: '31999999999',
  role: 'OWNER' as const,
  permissions: ['BOOKINGS_READ_ALL'],
  sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', 'http://backend.test');
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('admin availability rules', () => {
  it('creates OPEN slot rules for hours released from the 4x4 schedule', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      blockId: 'opening-1',
      mode: 'OPEN',
      type: 'SLOT',
      start: '2026-07-23T12:00:00Z',
      end: '2026-07-23T13:00:00Z',
      reason: 'Liberação manual da escala 4x4',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { saveAdminSession } = await import('../../../lib/storage');
    saveAdminSession('session-token', admin);
    const { createAdminBlocks } = await import('./manage-admin-blocks');

    await createAdminBlocks({
      entries: [{ date: '2026-07-23', times: ['09:00'] }],
      mode: 'specific-hours',
      ruleMode: 'OPEN',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/admin/availability-blocks');
    expect(new Headers(init.headers).get('X-ADMIN-SESSION')).toBe('session-token');
    expect(JSON.parse(String(init.body))).toEqual({
      mode: 'OPEN',
      type: 'SLOT',
      startAt: '2026-07-23T09:00:00',
      endAt: '2026-07-23T10:00:00',
      reason: 'Liberação manual da escala 4x4',
      cancelConflictingBookings: false,
    });
  });
});
