import { useMemo, useState } from "react";
import type { BookingListEntry } from "../types";
import { BookingDetailCard } from "./BookingDetailCard";
import { BookingList } from "./BookingList";

type BookingWorkspaceProps = {
  bookings: BookingListEntry[];
};

export function BookingWorkspace({ bookings }: BookingWorkspaceProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(bookings[0]?.model.id ?? "");

  const selectedBooking = useMemo(
    () => bookings.find(({ model }) => model.id === selectedEventId) ?? bookings[0],
    [bookings, selectedEventId],
  );

  return (
    <div className="my-bookings__workspace">
      <BookingList bookings={bookings} selectedEventId={selectedBooking?.model.id} onSelect={(booking) => setSelectedEventId(booking.eventId)} />
      {selectedBooking ? <BookingDetailCard booking={selectedBooking.model} /> : <p className="my-bookings__empty">Selecione um agendamento para ver os detalhes.</p>}
    </div>
  );
}
