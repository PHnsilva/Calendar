import { apiGet } from "../../../shared/api/http-client";
import type { Booking, BookingAdminFilters } from "../model/booking";
import type { BookingDto } from "./booking.dto";
import { mapBookingDto, mapBookingDtos } from "./booking.mapper";

export async function getBookingByManageToken(manageToken: string): Promise<Booking> {
  const dto = await apiGet<BookingDto>("/api/servicos/me", {
    query: { token: manageToken },
  });
  return mapBookingDto(dto);
}

export async function listMyBookingsByManageToken(manageToken: string, signal?: AbortSignal): Promise<Booking[]> {
  const dtos = await apiGet<BookingDto[]>("/api/servicos/my", {
    query: { token: manageToken },
    signal,
  });
  return mapBookingDtos(dtos);
}

export async function listAdminBookings(
  adminToken: string,
  filters: BookingAdminFilters = {},
): Promise<Booking[]> {
  const dtos = await apiGet<BookingDto[]>("/api/servicos/admin", {
    adminToken,
    query: filters,
  });
  return mapBookingDtos(dtos);
}
