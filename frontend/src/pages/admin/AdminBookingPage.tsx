import { Navigate, useParams } from "react-router-dom";
import { getLocalCalendarEvents } from "../../lib/storage";

export default function AdminBookingPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const booking = getLocalCalendarEvents().find((item) => item.id === eventId);

  if (!booking) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/admin/dashboard" replace state={{ selectedEventId: booking.id }} />;
}
