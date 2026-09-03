import { normalizePhone } from "../../../lib/authRole";
import type { ServicoRequest, ServicoResponse } from "../../../types/api";

export type HomeBookingEditDraft = {
  serviceType: string;
  date: string;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  street: string;
  number: string;
};

export function buildHomeBookingUpdatePayload(servico: ServicoResponse, draft: HomeBookingEditDraft): ServicoRequest {
  const nameParts = draft.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts.shift() ?? "";
  const lastName = nameParts.join(" ");
  const addressChanged = draft.street.trim() !== (servico.clientStreet ?? "").trim()
    || draft.number.trim() !== (servico.clientNumber ?? "").trim();

  return {
    serviceType: draft.serviceType.trim(),
    serviceNotes: servico.serviceNotes ?? "",
    date: draft.date,
    time: draft.time,
    clientFirstName: firstName,
    clientLastName: lastName,
    clientEmail: draft.email.trim(),
    clientPhone: normalizePhone(draft.phone),
    clientCity: servico.clientCity,
    clientState: servico.clientState,
    clientStreet: draft.street.trim(),
    clientNumber: draft.number.trim(),
    clientNeighborhood: servico.clientNeighborhood,
    clientCep: servico.clientCep,
    clientComplement: servico.clientComplement,
    clientLatitude: addressChanged ? undefined : servico.clientLatitude,
    clientLongitude: addressChanged ? undefined : servico.clientLongitude,
    reservedPhonePassword: undefined,
  };
}
