import { apiPost } from '../../../lib/api-client';
import { getStoredAdminToken } from '../../../lib/storage';

export type AdminBlockMode = 'full-day' | 'specific-hours';

export type AdminBlockEntry = {
  date: string;
  times?: string[];
};

export type CreateAdminBlocksInput = {
  entries: AdminBlockEntry[];
  mode: AdminBlockMode;
  slotMinutes?: number;
  reason?: string;
  cancelConflictingBookings?: boolean;
};

type BackendBlockType = 'DAY' | 'SLOT';

type PreviewPayload = {
  mode: 'BLOCK';
  type: BackendBlockType;
  date?: string;
  startAt?: string;
  endAt?: string;
  reason?: string;
};

type CreatePayload = PreviewPayload & {
  cancelConflictingBookings?: boolean;
};

function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + minutesToAdd;
  return `${`${Math.floor(total / 60)}`.padStart(2, '0')}:${`${total % 60}`.padStart(2, '0')}`;
}

function toDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function buildDayPayload(date: string, reason?: string): PreviewPayload {
  return {
    mode: 'BLOCK',
    type: 'DAY',
    date,
    reason,
  };
}

function buildSlotPayload(date: string, startTime: string, slotMinutes: number, reason?: string): PreviewPayload {
  return {
    mode: 'BLOCK',
    type: 'SLOT',
    startAt: toDateTime(date, startTime),
    endAt: toDateTime(date, addMinutes(startTime, slotMinutes)),
    reason,
  };
}

function normalizeEntries(entries: AdminBlockEntry[]): AdminBlockEntry[] {
  return entries
    .map((entry) => ({
      date: entry.date,
      times: Array.from(new Set(entry.times ?? [])).sort(),
    }))
    .filter((entry) => entry.date);
}

function toPayloads(entry: AdminBlockEntry, mode: AdminBlockMode, slotMinutes: number, reason?: string): PreviewPayload[] {
  if (mode === 'full-day') {
    return [buildDayPayload(entry.date, reason)];
  }

  return (entry.times ?? []).map((time) => buildSlotPayload(entry.date, time, slotMinutes, reason));
}

export async function createAdminBlocks({
  entries,
  mode,
  slotMinutes = 60,
  reason = 'Bloqueio operacional',
  cancelConflictingBookings = false,
}: CreateAdminBlocksInput): Promise<void> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error('Token administrativo ausente.');
  }

  const normalizedEntries = normalizeEntries(entries);

  if (normalizedEntries.length === 0) {
    throw new Error('Selecione pelo menos um dia para bloquear.');
  }

  if (mode === 'specific-hours' && normalizedEntries.every((entry) => (entry.times?.length ?? 0) === 0)) {
    throw new Error('Selecione ao menos um horário para o bloqueio parcial.');
  }

  for (const entry of normalizedEntries) {
    const payloads = toPayloads(entry, mode, slotMinutes, reason);

    for (const payload of payloads) {
      const requestBody: CreatePayload = {
        ...payload,
        cancelConflictingBookings,
      };

      await apiPost('/api/admin/availability-blocks', requestBody, {
        adminToken,
      });
    }
  }
}
