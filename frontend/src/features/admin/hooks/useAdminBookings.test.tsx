// @vitest-environment jsdom
import { StrictMode, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAdminBookings } from '../api/get-admin-bookings';
import { useAdminBookings } from './useAdminBookings';

vi.mock('../api/get-admin-bookings', () => ({
  getAdminBookings: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useAdminBookings', () => {
  it('deduplicates the initial load and does not poll or refetch on focus', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveRequest: (() => void) | undefined;
    vi.mocked(getAdminBookings).mockImplementation(() => new Promise((resolve) => {
      resolveRequest = () => resolve([]);
    }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </StrictMode>
    );

    const view = renderHook(
      () => useAdminBookings({ from: '2026-07-18', to: '2026-07-24' }),
      { wrapper },
    );

    await waitFor(() => expect(getAdminBookings).toHaveBeenCalledTimes(1));
    resolveRequest?.();
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(getAdminBookings).toHaveBeenCalledTimes(1);
    expect(getAdminBookings).toHaveBeenCalledWith(
      { from: '2026-07-18', to: '2026-07-24' },
      expect.any(AbortSignal),
    );

    view.rerender();
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(21_000);

    expect(getAdminBookings).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });
});
