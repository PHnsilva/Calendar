import { apiDelete, apiGet, apiPost } from '../../../lib/api-client';
import type { AvailabilityBlockPreviewResponse, AvailabilityBlockResponse } from '../../../types/api';
import { requireAdminSessionToken } from './admin-session';

export type AdminBlockMode = 'full-day' | 'specific-hours';

export type AdminBlockEntry = {
  date: string;
  times?: string[];
};

type DayPayloadItem = {
  key: string;
  date: string;
  startTime?: string;
  endTime?: string;
  payload: Record<string, unknown>;
};

export type PreviewAdminBlocksInput = {
  entries: AdminBlockEntry[];
  mode: AdminBlockMode;
  slotMinutes?: number;
  reason?: string;
};

export type CreateAdminBlocksInput = PreviewAdminBlocksInput & {
  cancelConflictingBookings?: boolean;
};

export type AdminBlockPreviewItem = {
  key: string;
  date: string;
  startTime?: string;
  endTime?: string;
  preview: AvailabilityBlockPreviewResponse;
};

export type AdminBlockListFilters = {
  from?: string;
  to?: string;
  mode?: string;
  type?: string;
  reason?: string;
};

function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + minutesToAdd;
  return `${`${Math.floor(total / 60)}`.padStart(2, '0')}:${`${total % 60}`.padStart(2, '0')}`;
}

function normalizeEntries(entries: AdminBlockEntry[]) {
  return entries
    .map((entry) => ({
      date: entry.date,
      times: Array.from(new Set(entry.times ?? [])).sort(),
    }))
    .filter((entry) => entry.date);
}

function buildPayloads(entry: AdminBlockEntry, mode: AdminBlockMode, slotMinutes: number, reason?: string): DayPayloadItem[] {
  if (mode === 'full-day') {
    return [
      {
        key: `${entry.date}-day`,
        date: entry.date,
        payload: {
          mode: 'BLOCK',
          type: 'DAY',
          date: entry.date,
          reason: reason?.trim() || 'Bloqueio administrativo',
        },
      },
    ];
  }

  return (entry.times ?? []).map((startTime) => ({
    key: `${entry.date}-${startTime}`,
    date: entry.date,
    startTime,
    endTime: addMinutes(startTime, slotMinutes),
    payload: {
      mode: 'BLOCK',
      type: 'SLOT',
      startAt: `${entry.date}T${startTime}:00`,
      endAt: `${entry.date}T${addMinutes(startTime, slotMinutes)}:00`,
      reason: reason?.trim() || 'Bloqueio administrativo',
    },
  }));
}

export async function previewAdminBlocks({ entries, mode, slotMinutes = 60, reason }: PreviewAdminBlocksInput): Promise<AdminBlockPreviewItem[]> {
  const adminToken = requireAdminSessionToken();
  const normalizedEntries = normalizeEntries(entries);
  const payloads: DayPayloadItem[] = normalizedEntries.flatMap((entry) => buildPayloads(entry, mode, slotMinutes, reason));

  return Promise.all(
    payloads.map(async (item) => ({
      key: item.key,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      preview: await apiPost<AvailabilityBlockPreviewResponse>('/api/admin/availability-blocks/preview', item.payload, { adminToken }),
    })),
  );
}

export async function createAdminBlocks({ entries, mode, slotMinutes = 60, reason, cancelConflictingBookings = false }: CreateAdminBlocksInput): Promise<AvailabilityBlockResponse[]> {
  const adminToken = requireAdminSessionToken();
  const normalizedEntries = normalizeEntries(entries);

  if (normalizedEntries.length === 0) {
    throw new Error('Selecione pelo menos um dia para bloquear.');
  }

  const payloads: DayPayloadItem[] = normalizedEntries.flatMap((entry) => buildPayloads(entry, mode, slotMinutes, reason));

  if (mode === 'specific-hours' && payloads.length === 0) {
    throw new Error('Selecione ao menos um horário para o bloqueio parcial.');
  }

  return Promise.all(
    payloads.map((item) =>
      apiPost<AvailabilityBlockResponse>(
        '/api/admin/availability-blocks',
        {
          ...item.payload,
          cancelConflictingBookings,
        },
        { adminToken },
      ),
    ),
  );
}

export async function listAdminBlocks(filters: AdminBlockListFilters = {}): Promise<AvailabilityBlockResponse[]> {
  const adminToken = requireAdminSessionToken();
  return apiGet<AvailabilityBlockResponse[]>('/api/admin/availability-blocks', {
    adminToken,
    query: filters,
  });
}

export async function deleteAdminBlock(blockId: string): Promise<void> {
  const adminToken = requireAdminSessionToken();
  await apiDelete<void>(`/api/admin/availability-blocks/${blockId}`, { adminToken });
}
