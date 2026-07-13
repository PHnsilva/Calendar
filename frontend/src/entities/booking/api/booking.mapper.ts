import type { Booking, BookingAddress, BookingProvider } from "../model/booking";
import { mapBookingStatus } from "../model/booking-status";
import type { BookingDto } from "./booking.dto";

function requiredText(value: string | null | undefined, field: string): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new TypeError(`Invalid booking ${field}`);
  }
  return normalized;
}

function optionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function bookingDate(value: string | null | undefined, field: string): Date {
  const date = new Date(requiredText(value, field));
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid booking ${field}`);
  }
  return date;
}

function buildAddress(dto: BookingDto): BookingAddress {
  const street = optionalText(dto.clientStreet);
  const number = optionalText(dto.clientNumber);
  const neighborhood = optionalText(dto.clientNeighborhood);
  const city = optionalText(dto.clientCity);
  const state = optionalText(dto.clientState);
  const locality = [city, state].filter(Boolean).join("/");
  const fallback = [
    [street, number].filter(Boolean).join(", "),
    neighborhood,
    locality,
  ].filter(Boolean).join(" - ");

  return {
    postalCode: optionalText(dto.clientCep),
    street,
    neighborhood,
    number,
    complement: optionalText(dto.clientComplement),
    city,
    state,
    latitude: dto.clientLatitude ?? null,
    longitude: dto.clientLongitude ?? null,
    formatted: optionalText(dto.clientAddressLine) ?? fallback,
  };
}

function buildProvider(dto: BookingDto): BookingProvider | null {
  const provider = {
    id: optionalText(dto.assignedProviderId),
    name: optionalText(dto.assignedProviderName),
    phone: optionalText(dto.assignedProviderPhone),
  };

  return provider.id || provider.name || provider.phone ? provider : null;
}

export function mapBookingDto(dto: BookingDto): Booking {
  const firstName = optionalText(dto.clientFirstName) ?? "";
  const lastName = optionalText(dto.clientLastName) ?? "";

  return {
    id: requiredText(dto.eventId, "eventId"),
    eventLink: optionalText(dto.eventLink),
    manageToken: optionalText(dto.manageToken),
    serviceType: optionalText(dto.serviceType) ?? "",
    serviceNotes: optionalText(dto.serviceNotes),
    startsAt: bookingDate(dto.start, "start"),
    endsAt: bookingDate(dto.end, "end"),
    client: {
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(" "),
      email: optionalText(dto.clientEmail),
      phone: optionalText(dto.clientPhone),
      address: buildAddress(dto),
    },
    status: mapBookingStatus(dto.status),
    assignedProvider: buildProvider(dto),
  };
}

export function mapBookingDtos(dtos: BookingDto[]): Booking[] {
  return dtos.map(mapBookingDto);
}
