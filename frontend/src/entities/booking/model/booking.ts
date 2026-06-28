import type { BookingStatus } from "./booking-status";

export type BookingAddress = {
  postalCode: string | null;
  street: string | null;
  neighborhood: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted: string;
};

export type BookingClient = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: BookingAddress;
};

export type BookingProvider = {
  id: string | null;
  name: string | null;
  phone: string | null;
};

export type Booking = {
  id: string;
  eventLink: string | null;
  manageToken: string | null;
  serviceType: string;
  serviceNotes: string | null;
  startsAt: Date;
  endsAt: Date;
  client: BookingClient;
  status: BookingStatus;
  assignedProvider: BookingProvider | null;
};

export type BookingAdminFilters = {
  from?: string;
  to?: string;
  status?: string;
  city?: string;
};
