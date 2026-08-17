import type { Booking } from "../../../entities/booking";
import type { BookingListEntry } from "../../bookings/types";

export type CreateBookingPrefill = {
  serviceType: string;
  client: {
    fullName: string;
    phone: string;
    email: string;
  };
  address: {
    postalCode: string;
    street: string;
    neighborhood: string;
    number: string;
    complement: string;
    city: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
  };
};

export function partitionClientBookings(bookings: BookingListEntry[], now: Date = new Date()) {
  const currentTime = now.getTime();
  const upcoming: BookingListEntry[] = [];
  const history: BookingListEntry[] = [];

  bookings.forEach((entry) => {
    if (entry.model.endsAt.getTime() <= currentTime) history.push(entry);
    else upcoming.push(entry);
  });

  history.sort((left, right) => right.model.startsAt.getTime() - left.model.startsAt.getTime());
  return { upcoming, history };
}

export function buildRebookingPrefill(booking: Booking): CreateBookingPrefill {
  return {
    serviceType: booking.serviceType,
    client: {
      fullName: booking.client.fullName,
      phone: booking.client.phone ?? "",
      email: booking.client.email ?? "",
    },
    address: {
      postalCode: booking.client.address.postalCode ?? "",
      street: booking.client.address.street ?? "",
      neighborhood: booking.client.address.neighborhood ?? "",
      number: booking.client.address.number ?? "",
      complement: booking.client.address.complement ?? "",
      city: booking.client.address.city ?? "",
      state: booking.client.address.state ?? "",
      latitude: booking.client.address.latitude,
      longitude: booking.client.address.longitude,
    },
  };
}
