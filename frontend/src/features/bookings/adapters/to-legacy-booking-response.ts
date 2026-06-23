import type { Booking } from "../../../entities/booking";
import type { ServicoResponse } from "../../../types/api";

export function toLegacyBookingResponse(booking: Booking): ServicoResponse {
  return {
    eventId: booking.id,
    eventLink: booking.eventLink ?? "",
    serviceType: booking.serviceType,
    serviceNotes: booking.serviceNotes ?? "",
    start: booking.startsAt.toISOString(),
    end: booking.endsAt.toISOString(),
    clientFirstName: booking.client.firstName,
    clientLastName: booking.client.lastName,
    clientEmail: booking.client.email ?? "",
    clientPhone: booking.client.phone ?? "",
    clientCep: booking.client.address.postalCode ?? "",
    clientStreet: booking.client.address.street ?? "",
    clientNeighborhood: booking.client.address.neighborhood ?? "",
    clientNumber: booking.client.address.number ?? "",
    clientComplement: booking.client.address.complement ?? undefined,
    clientCity: booking.client.address.city ?? "",
    clientState: booking.client.address.state ?? "",
    clientLatitude: booking.client.address.latitude ?? undefined,
    clientLongitude: booking.client.address.longitude ?? undefined,
    clientAddressLine: booking.client.address.formatted,
    status: booking.status.raw,
    manageToken: booking.manageToken ?? undefined,
    assignedProviderId: booking.assignedProvider?.id ?? undefined,
    assignedProviderName: booking.assignedProvider?.name ?? undefined,
    assignedProviderPhone: booking.assignedProvider?.phone ?? undefined,
  };
}
