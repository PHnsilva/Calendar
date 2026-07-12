import { isOwnerAdminPhone } from "../../../lib/authRole";
import { setAdminWorkspace } from "../../../lib/storage";
import type { AdminAuthConfirmResponse, AdminWorkspaceContext } from "../../../types/api";

export const ADMIN_WORKSPACE_ROUTE = "/admin";
export const PROVIDER_WORKSPACE_ROUTE = "/prestador";

export type AdminLoginDestination =
  | { kind: "choose-workspace"; to: typeof ADMIN_WORKSPACE_ROUTE }
  | { kind: "navigate"; to: typeof ADMIN_WORKSPACE_ROUTE | typeof PROVIDER_WORKSPACE_ROUTE; workspace: AdminWorkspaceContext };

export function resolveAdminLoginDestination(
  response: AdminAuthConfirmResponse,
  fallbackPhone = "",
): AdminLoginDestination {
  if (response.admin.role === "OWNER" || isOwnerAdminPhone(response.admin.phone || fallbackPhone)) {
    return { kind: "choose-workspace", to: ADMIN_WORKSPACE_ROUTE };
  }

  return {
    kind: "navigate",
    to: PROVIDER_WORKSPACE_ROUTE,
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

export function routeForAdminWorkspace(workspace: AdminWorkspaceContext): typeof ADMIN_WORKSPACE_ROUTE | typeof PROVIDER_WORKSPACE_ROUTE {
  return workspace.mode === "PROVIDER" ? PROVIDER_WORKSPACE_ROUTE : ADMIN_WORKSPACE_ROUTE;
}
