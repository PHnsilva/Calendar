import { listMyBookingsByManageToken } from "../../../entities/booking";

export function getMyBookings(token: string, signal?: AbortSignal) {
  return listMyBookingsByManageToken(token, signal);
}
