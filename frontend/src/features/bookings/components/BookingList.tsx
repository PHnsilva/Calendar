import type { ServicoResponse } from "../../../types/api";
import type { BookingListEntry } from "../types";
import { BookingListItem } from "./BookingListItem";

type BookingListProps = {
  bookings: BookingListEntry[];
  selectedEventId?: string;
  onSelect: (booking: ServicoResponse) => void;
};

export function BookingList({ bookings, selectedEventId, onSelect }: BookingListProps) {
  if (bookings.length === 0) {
    return <p className="my-bookings__empty">Nenhum agendamento encontrado.</p>;
  }

  return (
    <div className="my-bookings__list">
      {bookings.map(({ model, legacy }) => {
        return (
          <BookingListItem
            key={model.id}
            booking={model}
            isActive={model.id === selectedEventId}
            onSelect={() => onSelect(legacy)}
          />
        );
      })}
    </div>
  );
}
