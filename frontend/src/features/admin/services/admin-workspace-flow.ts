import { isOwnerAdminPhone } from "../../../lib/authRole";
import { setAdminWorkspace } from "../../../lib/storage";
import type { AdminAuthConfirmResponse, AdminWorkspaceContext } from "../../../types/api";

export const ADMIN_BOOKINGS_ROUTE = "/admin/dashboard?view=agendamentos";
export const PROVIDER_BOOKINGS_ROUTE = "/prestador/dashboard?view=agendamentos";

export type AdminLoginDestination =
  | { kind: "choose-workspace"; to: typeof ADMIN_BOOKINGS_ROUTE }
  | { kind: "navigate"; to: typeof ADMIN_BOOKINGS_ROUTE | typeof PROVIDER_BOOKINGS_ROUTE; workspace: AdminWorkspaceContext };

export function resolveAdminLoginDestination(
  response: AdminAuthConfirmResponse,
  fallbackPhone = "",
): AdminLoginDestination {
  if (response.admin.role === "OWNER" || isOwnerAdminPhone(response.admin.phone || fallbackPhone)) {
    return { kind: "choose-workspace", to: ADMIN_BOOKINGS_ROUTE };
  }

  return {
    kind: "navigate",
    to: PROVIDER_BOOKINGS_ROUTE,
    workspace: {
      mode: "PROVIDER",
      providerId: response.admin.id,
      providerName: response.admin.name,
    },
  };
}

export function applyAdminLoginDestination(
  response: AdminAuthConfirmResponse,
  fallbackPhone = "",
): AdminLoginDestination {
  const destination = resolveAdminLoginDestination(response, fallbackPhone);
  if (destination.kind === "navigate") {
    setAdminWorkspace(destination.workspace);
  }
  return destination;
}
