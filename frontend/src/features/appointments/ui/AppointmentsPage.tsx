import { type FormEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/brand/sg-navbar-logo-white-orange-v2.png";
import { formatPhoneInput, isValidMobilePhone, normalizePhone } from "../../../lib/authRole";
import { normalizeApiError, normalizeApiErrorMessage } from "../../../lib/error-normalizer";
import { getStoredClientProfile, saveClientProfile } from "../../../lib/storage";
import { buildBusinessWhatsAppUrl } from "../../../lib/support-contact";
import { usePublicBootstrap } from "../../public-config/hooks/usePublicBootstrap";
import { cancelPublicBooking, lookupPublicBookings } from "../../bookings/api/public-bookings";
import type { PublicBookingResponse } from "../../../types/api";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const bookingDateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function statusLabel(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "Cancelled";
  if (normalized === "PENDING_PHONE") return "Pending";
  return "Confirmed";
}

function canCancel(booking: PublicBookingResponse, noticeHours: number) {
  const status = booking.status.trim().toUpperCase();
  if (status === "CANCELLED" || status === "CANCELED") return false;
  const start = new Date(booking.start).getTime();
  return Number.isFinite(start) && start > Date.now() + noticeHours * 60 * 60 * 1000;
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const bootstrap = usePublicBootstrap();
  const cancellationNoticeHours = bootstrap.data?.booking?.cancellationNoticeHours ?? 2;
  const [phone, setPhone] = useState(() => formatPhoneInput(getStoredClientProfile()?.phone ?? ""));
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [bookings, setBookings] = useState<PublicBookingResponse[]>([]);
  const [selected, setSelected] = useState<PublicBookingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const cancelInFlight = useRef(false);

  const lookup = async (event?: FormEvent) => {
    event?.preventDefault();
    if (loading) return;
    if (!isValidMobilePhone(phone)) {
      setError("Enter a valid mobile phone number with area code.");
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    setLoading(true);
    setError("");
    try {
      const result = await lookupPublicBookings(normalizedPhone);
      setBookings(result);
      setSubmittedPhone(normalizedPhone);
      setLoaded(true);
      saveClientProfile({ phone: normalizedPhone });
    } catch (lookupError) {
      const normalizedError = normalizeApiError(lookupError, { context: "bookingDetails" });
      setError(normalizedError.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : normalizeApiErrorMessage(lookupError, {
        context: "bookingDetails",
        fallbackMessage: "We could not load your bookings. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const confirmCancellation = async () => {
    if (!selected || !submittedPhone || cancelInFlight.current) return;
    cancelInFlight.current = true;
    setCancelling(true);
    setError("");
    try {
      const cancelled = await cancelPublicBooking(selected.eventId, submittedPhone);
      setBookings((current) => current.map((item) => item.eventId === cancelled.eventId ? cancelled : item));
      setSelected(null);
    } catch (cancelError) {
      const normalizedError = normalizeApiError(cancelError, { context: "cancelBooking" });
      setError(normalizedError.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : normalizeApiErrorMessage(cancelError, {
        context: "cancelBooking",
        fallbackMessage: "We could not cancel this booking. Please try again.",
      }));
    } finally {
      cancelInFlight.current = false;
      setCancelling(false);
    }
  };

  return (
    <main className="appointments-modal-page">
      <div className="appointments-modal-page__backdrop" aria-hidden="true" />
      <section className="appointments-modal" aria-labelledby="appointments-modal-title">
        <header className="appointments-modal__header">
          <button type="button" className="appointments-modal__brand" onClick={() => navigate("/")} aria-label="Back to home">
            <img src={logo} alt="SG Pequenos Reparos" />
          </button>
          <div className="appointments-modal__heading">
            <h1 id="appointments-modal-title">My Bookings</h1>
            <p>Enter the phone number used when creating your booking.</p>
          </div>
          <button type="button" className="appointments-modal__close" onClick={() => navigate("/")} aria-label="Close">×</button>
        </header>

        <div className="appointments-modal__content">
          <form className="appointments-modal__toolbar" onSubmit={lookup}>
            <label className="appointments-modal__stats">
              <span>Phone number</span>
              <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(formatPhoneInput(event.target.value)); setError(""); }} placeholder="(31) 99999-9999" aria-label="Phone number" />
            </label>
            <button type="submit" disabled={loading}>{loading ? "Loading..." : "View bookings"}</button>
          </form>

          {error ? <p className="booking-form__feedback booking-form__feedback--error" role="alert">{error}</p> : null}

          {loaded && bookings.length === 0 ? (
            <section className="appointments-modal__empty"><h2>No bookings found</h2><p>Check the phone number and try again.</p></section>
          ) : null}

          {bookings.length > 0 ? (
            <div className="appointments-modal__grid" aria-live="polite">
              {bookings.map((booking) => (
                <article className="appointments-modal-card" key={booking.eventId}>
                  <header className="appointments-modal-card__header"><div className="appointments-modal-card__title"><div><p>Service</p><h2>{booking.serviceType}</h2></div></div></header>
                  <div className="appointments-modal-card__summary">
                    <span><b>Date and time</b>{bookingDateTime.format(new Date(booking.start))}</span>
                    <span><b>Status</b>{statusLabel(booking.status)}</span>
                  </div>
                  {canCancel(booking, cancellationNoticeHours) ? (
                    <div className="appointments-modal-card__actions"><button type="button" className="appointments-card-action appointments-card-action--danger" onClick={() => setSelected(booking)}>Cancel</button></div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          {loaded ? (
            <section className="appointments-modal__empty">
              <p>If you would like to change any information or check additional booking details, please contact the service provider.</p>
              <a className="primary-action" href={buildBusinessWhatsAppUrl("Hello, I would like to change or check information about my booking.")} target="_blank" rel="noreferrer">Contact the provider</a>
            </section>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div className="appointments-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
          <button type="button" className="appointments-detail-overlay__backdrop" onClick={() => !cancelling && setSelected(null)} aria-label="Close confirmation" />
          <section className="appointments-detail-overlay__panel">
            <header><div><span>Cancellation</span><strong id="cancel-booking-title">Are you sure you want to cancel this booking?</strong></div></header>
            <div className="appointments-detail-overlay__body">
              <dl className="appointments-modal-card__summary">
                <div><dt>Service</dt><dd>{selected.serviceType}</dd></div>
                <div><dt>Date and time</dt><dd>{bookingDateTime.format(new Date(selected.start))}</dd></div>
              </dl>
              <div className="booking-detail__actions">
                <button type="button" className="secondary-action" disabled={cancelling} onClick={() => setSelected(null)}>Back</button>
                <button type="button" className="primary-action" disabled={cancelling} onClick={confirmCancellation}>{cancelling ? "Cancelling..." : "Confirm cancellation"}</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
