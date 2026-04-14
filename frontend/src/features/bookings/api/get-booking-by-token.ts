import { apiClient } from "../../../lib/api-client";
import { getManageTokenByEventId, getManageTokens, saveManageToken } from "../../../lib/storage";
import type { ServicoResponse } from "../../../types/api";

export function getBookingByToken(token: string) {
  return apiClient<ServicoResponse>("/api/servicos/me", {
    method: "GET",
    query: { token },
  });
}

function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens.map((item) => item.trim()).filter(Boolean)));
}

export async function resolveManageTokenForEventId(eventId: string, preferredTokens: string[] = []): Promise<string> {
  const normalizedEventId = eventId.trim();
  if (!normalizedEventId) return "";

  const linkedToken = getManageTokenByEventId(normalizedEventId);
  const candidates = uniqueTokens([linkedToken, ...preferredTokens, ...getManageTokens()]);

  for (const token of candidates) {
    try {
      const booking = await getBookingByToken(token);
      if (booking.eventId === normalizedEventId) {
        saveManageToken(token, normalizedEventId);
        return token;
      }
    } catch {
      // tenta próximo token salvo
    }
  }

  return "";
}
