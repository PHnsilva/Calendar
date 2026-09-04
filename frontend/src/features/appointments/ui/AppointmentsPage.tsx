import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/brand/sg-navbar-logo-white-orange-v2.png";
import { isValidMobilePhone, normalizePhone } from "../../../lib/authRole";
import { normalizeApiError } from "../../../lib/error-normalizer";
import { getClientProfileChangedEventName, getStoredClientProfile } from "../../../lib/storage";
import { buildBusinessWhatsAppUrl } from "../../../lib/support-contact";
import { usePublicBootstrap } from "../../public-config/hooks/usePublicBootstrap";
import { cancelPublicBooking, lookupPublicBookings } from "../../bookings/api/public-bookings";
import type { PublicBookingResponse } from "../../../types/api";

const ClientProfileModal = lazy(() => import("../../../components/screens/CalendarMateRoutes")
  .then(({ CalendarMateModal }) => ({ default: CalendarMateModal })));

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const bookingDateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const bookingDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const bookingTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function statusLabel(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "Cancelado";
  if (normalized === "PENDING" || normalized === "PENDING_PHONE") return "Pendente";
  return "Confirmado";
}

function canCancel(booking: PublicBookingResponse, noticeHours: number) {
  const status = booking.status.trim().toUpperCase();
  if (status === "CANCELLED" || status === "CANCELED") return false;
  const start = new Date(booking.start).getTime();
  return Number.isFinite(start) && start > Date.now() + noticeHours * 60 * 60 * 1000;
}

function providerMessage(booking: PublicBookingResponse) {
  const start = new Date(booking.start);
  return [
    `Serviço: ${booking.serviceType}`,
    `Data: ${bookingDate.format(start)}`,
    `Horário: ${bookingTime.format(start)}`,
  ].join("\n");
}

function useClientProfilePhone() {
  const [phone, setPhone] = useState(() => getStoredClientProfile()?.phone ?? "");

  useEffect(() => {
    const refresh = () => setPhone(getStoredClientProfile()?.phone ?? "");
    window.addEventListener(getClientProfileChangedEventName(), refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(getClientProfileChangedEventName(), refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return phone;
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const bootstrap = usePublicBootstrap();
  const cancellationNoticeHours = bootstrap.data?.booking?.cancellationNoticeHours ?? 2;
  const profilePhone = useClientProfilePhone();
  const normalizedProfilePhone = normalizePhone(profilePhone);
  const hasProfilePhone = isValidMobilePhone(normalizedProfilePhone);
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [bookings, setBookings] = useState<PublicBookingResponse[]>([]);
  const [selected, setSelected] = useState<PublicBookingResponse | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const cancelInFlight = useRef(false);
  const lookupGeneration = useRef(0);

  useEffect(() => {
    const generation = ++lookupGeneration.current;
    let active = true;

    setBookings([]);
    setSelected(null);
    setSubmittedPhone("");
    setLoaded(false);
    setError("");

    if (!hasProfilePhone) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    void lookupPublicBookings(normalizedProfilePhone)
      .then((result) => {
        if (!active || generation !== lookupGeneration.current) return;
        setBookings(result);
        setSubmittedPhone(normalizedProfilePhone);
        setLoaded(true);
      })
      .catch((lookupError) => {
        if (!active || generation !== lookupGeneration.current) return;
        const normalizedError = normalizeApiError(lookupError, { context: "bookingDetails" });
        setError(normalizedError.status === 429
          ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : "Não foi possível carregar seus agendamentos. Tente novamente.");
      })
      .finally(() => {
        if (active && generation === lookupGeneration.current) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hasProfilePhone, normalizedProfilePhone]);

  const confirmCancellation = async () => {
    if (!selected || !submittedPhone || cancelInFlight.current) return;
    const bookingToCancel = selected;
    const phoneUsedForLookup = submittedPhone;
    const generation = lookupGeneration.current;
    cancelInFlight.current = true;
    setCancelling(true);
    setError("");
    try {
      const cancelled = await cancelPublicBooking(bookingToCancel.eventId, phoneUsedForLookup);
      if (generation === lookupGeneration.current) {
        setBookings((current) => current.map((item) => item.eventId === cancelled.eventId ? cancelled : item));
        setSelected(null);
      }
    } catch (cancelError) {
      if (generation === lookupGeneration.current) {
        const normalizedError = normalizeApiError(cancelError, { context: "cancelBooking" });
        setError(normalizedError.status === 429
          ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : "Não foi possível cancelar este agendamento. Tente novamente.");
      }
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
          <button type="button" className="appointments-modal__brand" onClick={() => navigate("/")} aria-label="Voltar para o início">
            <img src={logo} alt="SG Pequenos Reparos" />
          </button>
          <div className="appointments-modal__heading">
            <h1 id="appointments-modal-title">Meus agendamentos</h1>
            <p>Consulte automaticamente os agendamentos vinculados ao telefone do seu perfil.</p>
          </div>
          <button type="button" className="appointments-modal__close" onClick={() => navigate("/")} aria-label="Fechar">×</button>
        </header>

        <div className="appointments-modal__content">
          {error ? <p className="booking-form__feedback booking-form__feedback--error" role="alert">{error}</p> : null}

          {!hasProfilePhone ? (
            <section className="appointments-modal__empty">
              <h2>Telefone não informado</h2>
              <p>Adicione um telefone ao seu perfil para visualizar seus agendamentos.</p>
              <button type="button" onClick={() => setProfileOpen(true)}>Completar perfil</button>
            </section>
          ) : null}

          {hasProfilePhone && loading ? (
            <section className="appointments-modal__empty" aria-live="polite" aria-busy="true">
              <span className="appointments-modal__spinner" aria-hidden="true" />
              <h2>Carregando agendamentos</h2>
              <p>Aguarde enquanto consultamos os agendamentos vinculados ao seu perfil.</p>
            </section>
          ) : null}

          {hasProfilePhone && loaded && bookings.length === 0 ? (
            <section className="appointments-modal__empty"><h2>Nenhum agendamento encontrado</h2><p>Não encontramos agendamentos vinculados ao telefone do seu perfil.</p></section>
          ) : null}

          {bookings.length > 0 ? (
            <div className="appointments-modal__grid" aria-live="polite">
              {bookings.map((booking) => (
                <article className="appointments-modal-card" key={booking.eventId}>
                  <header className="appointments-modal-card__header"><div className="appointments-modal-card__title"><div><p>Serviço</p><h2>{booking.serviceType}</h2></div></div></header>
                  <div className="appointments-modal-card__summary">
                    <span><b>Data e horário</b>{bookingDateTime.format(new Date(booking.start))}</span>
                    <span><b>Status</b>{statusLabel(booking.status)}</span>
                  </div>
                  {canCancel(booking, cancellationNoticeHours) ? (
                    <div className="appointments-modal-card__actions"><button type="button" className="appointments-card-action appointments-card-action--danger" onClick={() => setSelected(booking)}>Cancelar</button></div>
                  ) : null}
                  <div className="appointments-modal-card__contact">
                    <p>Para alterar informações ou conferir mais detalhes sobre este agendamento, entre em contato com o prestador.</p>
                    <a className="appointments-card-action appointments-card-action--primary" href={buildBusinessWhatsAppUrl(providerMessage(booking))} target="_blank" rel="noreferrer">Falar com o prestador</a>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div className="appointments-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
          <button type="button" className="appointments-detail-overlay__backdrop" onClick={() => !cancelling && setSelected(null)} aria-label="Fechar confirmação" />
          <section className="appointments-detail-overlay__panel">
            <header><div><span>Cancelamento</span><strong id="cancel-booking-title">Tem certeza de que deseja cancelar este agendamento?</strong></div></header>
            <div className="appointments-detail-overlay__body">
              <dl className="appointments-modal-card__summary">
                <div><dt>Serviço</dt><dd>{selected.serviceType}</dd></div>
                <div><dt>Data e horário</dt><dd>{bookingDateTime.format(new Date(selected.start))}</dd></div>
              </dl>
              <div className="booking-detail__actions">
                <button type="button" className="secondary-action" disabled={cancelling} onClick={() => setSelected(null)}>Voltar</button>
                <button type="button" className="primary-action" disabled={cancelling} onClick={confirmCancellation}>{cancelling ? "Cancelando..." : "Confirmar cancelamento"}</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {profileOpen ? (
        <Suspense fallback={null}>
          <ClientProfileModal modal="client-profile" onClose={() => setProfileOpen(false)} />
        </Suspense>
      ) : null}
    </main>
  );
}
