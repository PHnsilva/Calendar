import { useEffect, useMemo, useState } from "react";
import type { ServicoResponse } from "../../../types/api";
import { BookingDetailCard } from "./BookingDetailCard";
import { BookingList } from "./BookingList";

type BookingWorkspaceProps = {
  bookings: ServicoResponse[];
};

export function BookingWorkspace({ bookings }: BookingWorkspaceProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(bookings[0]?.eventId ?? "");

  useEffect(() => {
    if (!bookings.find((booking) => booking.eventId === selectedEventId)) {
      setSelectedEventId(bookings[0]?.eventId ?? "");
    }
  }, [bookings, selectedEventId]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.eventId === selectedEventId) ?? bookings[0],
    [bookings, selectedEventId],
  );

  return (
    <div className="my-bookings__workspace">
      <BookingList bookings={bookings} selectedEventId={selectedBooking?.eventId} onSelect={(booking) => setSelectedEventId(booking.eventId)} />
      {selectedBooking ? <BookingDetailCard booking={selectedBooking} /> : <p className="my-bookings__empty">Selecione um agendamento para ver os detalhes.</p>}
    </div>
  );
}
