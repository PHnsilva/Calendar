import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/brand/sg-navbar-logo-white-orange-v2.png";
import { CalendarMateModal, type ModalKind } from "../../../components/screens/CalendarMateRoutes";
import type { Booking } from "../../../entities/booking";
import { BookingDetailCard, type BookingDetailMode } from "../../bookings/components/BookingDetailCard";
import { BookingStatusBadge } from "../../bookings/components/BookingStatusBadge";
import { useMyBookings } from "../../bookings/hooks/useMyBookings";
import type { BookingListEntry } from "../../bookings/types";
import { formatDateTime, isWithinTwoHours } from "../../../lib/dates";
import { getManageTokens, resolveManageToken } from "../../../lib/storage";

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
}: {
  entry: BookingListEntry;
  onOpen: (mode: BookingDetailMode) => void;
  onContact: () => void;
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

      {!token ? <p className="appointments-modal-card__notice">Recupere o acesso para editar ou cancelar este agendamento.</p> : null}
      {isLocked && !isCancelled ? <p className="appointments-modal-card__notice">Alterações ficam bloqueadas nas 2 horas anteriores ao atendimento.</p> : null}

      <div className="appointments-modal-card__actions">
        <button type="button" className="appointments-card-action appointments-card-action--primary" onClick={() => onOpen("view")}>
          Ver detalhes
        </button>
        <button type="button" className="appointments-card-action" onClick={() => onOpen("edit")} disabled={!canManage}>
          Editar / reagendar
        </button>
        <button type="button" className="appointments-card-action" onClick={onContact}>
          {booking.assignedProvider?.phone ? "Falar com prestador" : "Fale conosco"}
        </button>
        <button type="button" className="appointments-card-action appointments-card-action--danger" onClick={() => onOpen("cancel")} disabled={!canManage}>
          Cancelar
        </button>
      </div>

      {booking.eventLink ? (
        <a className="appointments-modal-card__calendar-link" href={booking.eventLink} target="_blank" rel="noreferrer">
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
  const bookingsQuery = useMyBookings(tokens);
  const bookings = bookingsQuery.data ?? [];

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
    if (!stillExists && !bookingsQuery.isFetching) setSelected(null);
  }, [bookings, bookingsQuery.isFetching, selected]);

  const closeChildModal = () => {
    setChildModal(null);
    setTokens(getManageTokens());
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
            <button type="button" className="appointments-modal__create" onClick={() => setChildModal("create-client")}>+ Novo agendamento</button>
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
            {bookingsQuery.isFetching ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>

        <div className="appointments-modal__content">
          {tokens.length === 0 ? (
            <section className="appointments-modal__empty">
              <span aria-hidden="true">🔐</span>
              <h2>Nenhum acesso salvo neste navegador</h2>
              <p>Recupere seus agendamentos pelo telefone usado no cadastro ou crie um novo serviço.</p>
              <div>
                <Link to="/recover">Recuperar agendamentos</Link>
                <button type="button" onClick={() => setChildModal("create-client")}>Criar agendamento</button>
              </div>
            </section>
          ) : null}

          {tokens.length > 0 && bookingsQuery.isLoading ? (
            <section className="appointments-modal__empty">
              <span className="appointments-modal__spinner" aria-hidden="true" />
              <h2>Carregando agendamentos</h2>
              <p>Buscando os serviços vinculados aos seus códigos de acesso.</p>
            </section>
          ) : null}

          {tokens.length > 0 && bookingsQuery.isError ? (
            <section className="appointments-modal__empty">
              <span aria-hidden="true">!</span>
              <h2>Não foi possível carregar os agendamentos</h2>
              <p>Confira a conexão e tente novamente.</p>
              <button type="button" onClick={() => void bookingsQuery.refetch()}>Tentar novamente</button>
            </section>
          ) : null}

          {tokens.length > 0 && !bookingsQuery.isLoading && !bookingsQuery.isError && bookings.length === 0 ? (
            <section className="appointments-modal__empty">
              <span aria-hidden="true">📅</span>
              <h2>Nenhum agendamento encontrado</h2>
              <p>Crie um novo atendimento ou recupere serviços feitos em outro navegador.</p>
              <div>
                <Link to="/recover">Recuperar</Link>
                <button type="button" onClick={() => setChildModal("create-client")}>Criar agendamento</button>
              </div>
            </section>
          ) : null}

          {bookings.length > 0 ? (
            <div className="appointments-modal__grid">
              {bookings.map((entry) => (
                <BookingSummaryCard
                  key={entry.model.id}
                  entry={entry}
                  onOpen={(mode) => setSelected({ entry, mode })}
                  onContact={() => handleContact(entry.model)}
                />
              ))}
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
                onDeleted={() => setSelected(null)}
              />
            </div>
          </section>
        </div>
      ) : null}

      <CalendarMateModal modal={childModal} onClose={closeChildModal} onOpenModal={setChildModal} />
    </main>
  );
}
