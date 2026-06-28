import { listMyBookingsByManageToken } from "../../../entities/booking";

export function getMyBookings(token: string) {
  return listMyBookingsByManageToken(token);
}
