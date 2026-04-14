import type { BookingRecord } from "../../../types/booking";
import type { ServicoRequest } from "../../../types/api";
import { BookingDetailCard } from "./BookingDetailCard";
import { BookingList } from "./BookingList";

type BookingWorkspaceProps = {
  bookings: BookingRecord[];
  selectedEventId?: string;
  onSelect: (eventId: string) => void;
  onSave: (eventId: string, payload: ServicoRequest) => Promise<void> | void;
  onDelete: (eventId: string) => Promise<void> | void;
  isSaving: boolean;
  isDeleting: boolean;
};

export function BookingWorkspace({
  bookings,
  selectedEventId,
  onSelect,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: BookingWorkspaceProps) {
  const selectedBooking = bookings.find((booking) => booking.eventId === selectedEventId) ?? bookings[0];

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)" }}>
      <aside>
        <BookingList
          bookings={bookings}
          selectedEventId={selectedBooking?.eventId}
          onSelect={onSelect}
        />
      </aside>

      <div>
        {selectedBooking ? (
          <BookingDetailCard
            booking={selectedBooking}
            onSave={onSave}
            onDelete={onDelete}
            isSaving={isSaving}
            isDeleting={isDeleting}
          />
        ) : null}
      </div>
    </div>
  );
}
