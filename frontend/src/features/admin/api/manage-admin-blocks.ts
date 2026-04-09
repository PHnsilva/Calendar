import { ApiError, apiClient } from '../../../lib/api-client';
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
};

type TimeRange = {
  startTime: string;
  endTime: string;
};

const CANDIDATE_PATHS = [
  '/api/admin/schedule-blocks',
  '/api/admin/blocks',
  '/api/admin/availability/blocks',
  '/api/admin/availability/block',
  '/api/admin/schedule/blocks',
];

function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + minutesToAdd;
  return `${`${Math.floor(total / 60)}`.padStart(2, '0')}:${`${total % 60}`.padStart(2, '0')}`;
}

function buildRanges(mode: AdminBlockMode, times: string[], slotMinutes: number): TimeRange[] {
  if (mode === 'full-day') {
    return [{ startTime: '00:00', endTime: '23:59' }];
  }

  return times.map((startTime) => ({
    startTime,
    endTime: addMinutes(startTime, slotMinutes),
  }));
}

function buildPayloadCandidates(date: string, range: TimeRange, mode: AdminBlockMode) {
  const fullDay = mode === 'full-day';
  const base = { date, startTime: range.startTime, endTime: range.endTime };

  return [
    { ...base, type: fullDay ? 'FULL_DAY' : 'TIME_RANGE' },
    { ...base, type: fullDay ? 'DAY' : 'TIME' },
    { ...base, blockType: fullDay ? 'FULL_DAY' : 'TIME_RANGE' },
    { ...base, blockedDate: date, blockType: fullDay ? 'FULL_DAY' : 'TIME_RANGE' },
    { ...base, serviceDate: date, blockType: fullDay ? 'FULL_DAY' : 'TIME_RANGE' },
    { date, fullDay, startTime: range.startTime, endTime: range.endTime },
  ];
}

function canRetry(error: unknown) {
  return error instanceof ApiError && [400, 404, 405, 415, 422].includes(error.status);
}

async function createSingleBlock(date: string, range: TimeRange, mode: AdminBlockMode, adminToken: string) {
  let lastError: unknown = null;

  for (const path of CANDIDATE_PATHS) {
    for (const body of buildPayloadCandidates(date, range, mode)) {
      try {
        await apiClient(path, {
          method: 'POST',
          body,
          adminToken,
        });
        return;
      } catch (error) {
        lastError = error;
        if (canRetry(error)) {
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Não foi possível criar o bloqueio administrativo.');
}

export async function createAdminBlocks({ entries, mode, slotMinutes = 60 }: CreateAdminBlocksInput): Promise<void> {
  const adminToken = getStoredAdminToken();
  if (!adminToken) {
    throw new Error('Token administrativo ausente.');
  }

  const normalizedEntries = entries
    .map((entry) => ({
      date: entry.date,
      times: Array.from(new Set(entry.times ?? [])).sort(),
    }))
    .filter((entry) => entry.date);

  if (normalizedEntries.length === 0) {
    throw new Error('Selecione pelo menos um dia para bloquear.');
  }

  for (const entry of normalizedEntries) {
    const ranges = buildRanges(mode, entry.times, slotMinutes);

    if (mode === 'specific-hours' && ranges.length === 0) {
      throw new Error('Selecione ao menos um horário para o bloqueio parcial.');
    }

    for (const range of ranges) {
      await createSingleBlock(entry.date, range, mode, adminToken);
    }
  }
}
