import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/brand/sg-navbar-logo-white-orange-v2.png";
import viewIcon from "../../../assets/wireframes/icons/booking-action-eye.svg";
import editIcon from "../../../assets/wireframes/icons/booking-action-pencil.svg";
import cancelIcon from "../../../assets/wireframes/icons/booking-action-cancel.svg";
import contactIcon from "../../../assets/wireframes/icons/booking-action-whatsapp.svg";
import calendarIcon from "../../../assets/wireframes/icons/booking-meta-calendar.svg";
import refreshIcon from "../../../assets/wireframes/icons/booking-search.svg";
import { CalendarMateModal, type ModalKind } from "../../../components/screens/CalendarMateRoutes";
import type { Booking } from "../../../entities/booking";
import { BookingDetailCard, type BookingDetailMode } from "../../bookings/components/BookingDetailCard";
import { BookingStatusBadge } from "../../bookings/components/BookingStatusBadge";
import { useMyBookings } from "../../bookings/hooks/useMyBookings";
import type { BookingListEntry } from "../../bookings/types";
import { formatDateTime, isWithinTwoHours } from "../../../lib/dates";
import { getManageTokens, resolveManageToken } from "../../../lib/storage";
import { buildRebookingPrefill, partitionClientBookings, type CreateBookingPrefill } from "../model/booking-history";

type SelectedBooking = {
  entry: BookingListEntry;
  mode: BookingDetailMode;
};

function normalizePhoneForWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function openProviderWhatsApp(booking: Booking): boolean {
  const phone = normalizePhoneForWhatsApp(booking.assignedProvider?.phone ?? "");
  if (!phone) return false;

  const message = encodeURIComponent(
    `Olá! Gostaria de falar sobre meu agendamento de ${booking.serviceType}, marcado para ${formatDateTime(booking.startsAt)}.`,
  );
  window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
  return true;
}

function BookingSummaryCard({
  entry,
  onOpen,
  onContact,
  onRebook,
  isPast,
}: {
  entry: BookingListEntry;
  onOpen: (mode: BookingDetailMode) => void;
  onContact: () => void;
  onRebook: () => void;
  isPast: boolean;
}) {
  const booking = entry.model;
  const token = resolveManageToken({ eventId: booking.id, manageToken: booking.manageToken ?? undefined });
  const isCancelled = booking.status.code === "cancelled";
  const isLocked = isWithinTwoHours(booking.startsAt);
  const canManage = Boolean(token) && !isCancelled && !isLocked;
  const providerName = booking.assignedProvider?.name?.trim();

  return (
    <article className="appointments-modal-card">
      <header className="appointments-modal-card__header">
        <div className="appointments-modal-card__title">
          <span className="appointments-modal-card__service-mark" aria-hidden="true">SG</span>
          <div>
            <p>Serviço agendado</p>
            <h2>{booking.serviceType}</h2>
          </div>
        </div>
        <BookingStatusBadge status={booking.status} />
      </header>

      <div className="appointments-modal-card__summary">
        <span><b>Data e horário</b>{formatDateTime(booking.startsAt)}</span>
        <span><b>Local</b>{booking.client.address.formatted || "Endereço não informado"}</span>
        <span><b>Responsável</b>{providerName || "Aguardando definição"}</span>
      </div>

      {booking.serviceNotes ? <p className="appointments-modal-card__notes">{booking.serviceNotes}</p> : null}

      {!isPast && !token ? <p className="appointments-modal-card__notice">O código de gerenciamento deste agendamento não está salvo neste navegador.</p> : null}
      {!isPast && isLocked && !isCancelled ? <p className="appointments-modal-card__notice">Alterações ficam bloqueadas nas 2 horas anteriores ao atendimento.</p> : null}

      <div className="appointments-modal-card__actions">
        <button type="button" className="appointments-card-action appointments-card-action--primary" onClick={() => onOpen("view")}>
          <img src={viewIcon} alt="" aria-hidden="true" />
          Ver detalhes
        </button>
        {isPast ? (
          <button type="button" className="appointments-card-action appointments-card-action--primary" onClick={onRebook}>
            <img src={calendarIcon} alt="" aria-hidden="true" />
            Agendar novamente
          </button>
        ) : (
          <button type="button" className="appointments-card-action" onClick={() => onOpen("edit")} disabled={!canManage}>
            <img src={editIcon} alt="" aria-hidden="true" />
            Editar / reagendar
          </button>
        )}
        <button type="button" className="appointments-card-action" onClick={onContact}>
          <img src={contactIcon} alt="" aria-hidden="true" />
          {booking.assignedProvider?.phone ? "Falar com prestador" : "Fale conosco"}
        </button>
        {!isPast ? (
          <button type="button" className="appointments-card-action appointments-card-action--danger" onClick={() => onOpen("cancel")} disabled={!canManage}>
            <img src={cancelIcon} alt="" aria-hidden="true" />
            Cancelar
          </button>
        ) : null}
      </div>

      {booking.eventLink ? (
        <a className="appointments-modal-card__calendar-link" href={booking.eventLink} target="_blank" rel="noreferrer">
          <img src={calendarIcon} alt="" aria-hidden="true" />
          Abrir evento no calendário
        </a>
      ) : null}
    </article>
  );
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<string[]>(() => getManageTokens());
  const [selected, setSelected] = useState<SelectedBooking | null>(null);
  const [childModal, setChildModal] = useState<ModalKind>(null);
  const [createPrefill, setCreatePrefill] = useState<CreateBookingPrefill | undefined>();
  const bookingsQuery = useMyBookings(tokens);
  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);
  const hasBookings = bookings.length > 0;
  const { upcoming, history } = useMemo(() => partitionClientBookings(bookings), [bookings]);
  const showAccessEmpty = tokens.length === 0;
  const showInitialLoading = tokens.length > 0 && bookingsQuery.isLoading && !hasBookings;
  const showLoadError = tokens.length > 0 && bookingsQuery.isError && !hasBookings;
  const showEmpty = tokens.length > 0 && !bookingsQuery.isLoading && !bookingsQuery.isError && !bookingsQuery.isFetching && !hasBookings;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const stillExists = bookings.some(({ model }) => model.id === selected.entry.model.id);
    if (stillExists || bookingsQuery.isFetching) return;
    const timeoutId = window.setTimeout(() => setSelected(null), 0);
    return () => window.clearTimeout(timeoutId);
  }, [bookings, bookingsQuery.isFetching, selected]);

  const closeChildModal = () => {
    setChildModal(null);
    setCreatePrefill(undefined);
    setTokens(getManageTokens());
  };

  const openCreate = () => {
    setCreatePrefill(undefined);
    setChildModal("create-client");
  };

  const rebook = (booking: Booking) => {
    setCreatePrefill(buildRebookingPrefill(booking));
    setChildModal("create-client");
  };

  const handleDeleted = () => {
    setSelected(null);
    setTokens(getManageTokens());
    bookingsQuery.refetch().catch(() => undefined);
  };

  const handleContact = (booking: Booking) => {
    if (!openProviderWhatsApp(booking)) setChildModal("contact");
  };

  return (
    <main className="appointments-modal-page">
      <div className="appointments-modal-page__backdrop" aria-hidden="true" />
      <section className="appointments-modal" role="dialog" aria-modal="true" aria-labelledby="appointments-modal-title">
        <header className="appointments-modal__header">
          <button type="button" className="appointments-modal__brand" onClick={() => navigate("/")} aria-label="Voltar para a página inicial">
            <img src={logo} alt="SG Pequenos Reparos" />
          </button>

          <div className="appointments-modal__heading">
            <h1 id="appointments-modal-title">Meus agendamentos</h1>
            <p>Consulte cada serviço e escolha a ação necessária.</p>
          </div>

          <div className="appointments-modal__header-actions">
            <button type="button" className="appointments-modal__create" onClick={openCreate}>+ Novo agendamento</button>
            <button type="button" className="appointments-modal__profile" onClick={() => setChildModal("client-profile")}>Perfil</button>
            <button type="button" className="appointments-modal__close" onClick={() => navigate("/")} aria-label="Fechar meus agendamentos">×</button>
          </div>
        </header>

        <div className="appointments-modal__toolbar">
          <div className="appointments-modal__stats">
            <span>
              {bookingsQuery.isLoading
                ? "Verificando serviços..."
                : <><b>{bookings.length}</b> {bookings.length === 1 ? "serviço encontrado" : "serviços encontrados"}</>}
            </span>
          </div>
          <button type="button" onClick={() => void bookingsQuery.refetch()} disabled={bookingsQuery.isFetching}>
            <img src={refreshIcon} alt="" aria-hidden="true" />
            {bookingsQuery.isFetching ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>

        <div className="appointments-modal__content">
          {bookingsQuery.isFetching && hasBookings ? (
            <p className="appointments-modal__inline-status">Atualizando com os dados mais recentes...</p>
          ) : null}

          {showAccessEmpty ? (
            <section className="appointments-modal__empty">
              <span aria-hidden="true">🔐</span>
              <h2>Nenhum acesso salvo neste navegador</h2>
              <p>Crie um novo serviço para começar.</p>
              <div>
                <button type="button" onClick={openCreate}>Criar agendamento</button>
              </div>
            </section>
          ) : null}

          {showInitialLoading ? (
            <section className="appointments-modal__empty">
              <span className="appointments-modal__spinner" aria-hidden="true" />
              <h2>Carregando agendamentos</h2>
              <p>Buscando os serviços vinculados aos seus códigos de acesso.</p>
            </section>
          ) : null}

          {showLoadError ? (
            <section className="appointments-modal__empty">
              <span aria-hidden="true">!</span>
              <h2>Não foi possível carregar os agendamentos</h2>
              <p>Confira a conexão e tente novamente.</p>
              <button type="button" onClick={() => void bookingsQuery.refetch()}>Tentar novamente</button>
            </section>
          ) : null}

          {showEmpty ? (
            <section className="appointments-modal__empty">
              <span aria-hidden="true">📅</span>
              <h2>Nenhum agendamento encontrado</h2>
              <p>Crie um novo atendimento para começar.</p>
              <div>
                <button type="button" onClick={openCreate}>Criar agendamento</button>
              </div>
            </section>
          ) : null}

          {hasBookings ? (
            <div className="appointments-modal__sections">
              <section className="appointments-modal__section" aria-labelledby="upcoming-appointments-title">
                <header><h2 id="upcoming-appointments-title">Próximos agendamentos</h2><span>{upcoming.length}</span></header>
                {upcoming.length > 0 ? (
                  <div className="appointments-modal__grid">
                    {upcoming.map((entry) => (
                      <BookingSummaryCard key={entry.model.id} entry={entry} isPast={false} onOpen={(mode) => setSelected({ entry, mode })} onContact={() => handleContact(entry.model)} onRebook={() => rebook(entry.model)} />
                    ))}
                  </div>
                ) : <p className="appointments-modal__section-empty">Nenhum agendamento futuro.</p>}
              </section>

              <section className="appointments-modal__section appointments-modal__section--history" aria-labelledby="booking-history-title">
                <header><h2 id="booking-history-title">Histórico</h2><span>{history.length}</span></header>
                {history.length > 0 ? (
                  <div className="appointments-modal__grid">
                    {history.map((entry) => (
                      <BookingSummaryCard key={entry.model.id} entry={entry} isPast onOpen={(mode) => setSelected({ entry, mode })} onContact={() => handleContact(entry.model)} onRebook={() => rebook(entry.model)} />
                    ))}
                  </div>
                ) : <p className="appointments-modal__section-empty">Seu histórico ainda está vazio.</p>}
              </section>
            </div>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div className="appointments-detail-overlay" role="dialog" aria-modal="true" aria-label={`Detalhes de ${selected.entry.model.serviceType}`}>
          <button type="button" className="appointments-detail-overlay__backdrop" onClick={() => setSelected(null)} aria-label="Fechar detalhes" />
          <section className="appointments-detail-overlay__panel">
            <header>
              <div>
                <span>Gerenciar serviço</span>
                <strong>{selected.entry.model.serviceType}</strong>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes">×</button>
            </header>
            <div className="appointments-detail-overlay__body">
              <BookingDetailCard
                booking={selected.entry.model}
                initialMode={selected.mode}
                onDeleted={handleDeleted}
              />
            </div>
          </section>
        </div>
      ) : null}

      <CalendarMateModal modal={childModal} context={{ createPrefill }} onClose={closeChildModal} onOpenModal={setChildModal} />
    </main>
  );
}
