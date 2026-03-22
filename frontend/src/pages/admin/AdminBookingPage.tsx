import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminDashboardShell from "../../features/admin/components/AdminDashboardShell";
import { useAdminBookings } from "../../features/admin/hooks/useAdminBookings";
import { clearAdminToken, useAdminStore } from "../../stores/admin-store";

function formatValue(value?: string): string {
  return value && value.trim().length > 0 ? value : "Não informado";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminBookingPage() {
  const navigate = useNavigate();
  const params = useParams<{ eventId: string }>();
  const { token, hasToken } = useAdminStore();
  const { filteredBookings, bookingsQuery, deleteMutation, removeBooking } = useAdminBookings({
    search: "",
    status: "",
    city: "",
    from: "",
    to: "",
  });

  useEffect(() => {
    if (!hasToken) {
      navigate("/admin", { replace: true });
    }
  }, [hasToken, navigate]);

  const booking = useMemo(
    () => filteredBookings.find((item) => item.eventId === params.eventId) ?? null,
    [filteredBookings, params.eventId],
  );

  if (!token) {
    return null;
  }

  return (
    <AdminDashboardShell
      token={token}
      onClearToken={() => {
        clearAdminToken();
        navigate("/admin", { replace: true });
      }}
    >
      <section className="admin-booking-page panel">
        <div className="admin-booking-page__header">
          <div>
            <span className="admin-section-eyebrow">Detalhe do agendamento</span>
            <h1 className="admin-section-title">{booking ? `${booking.clientFirstName} ${booking.clientLastName}` : "Carregando"}</h1>
          </div>

          <Link to="/admin/dashboard" className="admin-btn admin-btn--ghost admin-btn--link">
            Voltar ao dashboard
          </Link>
        </div>

        {bookingsQuery.isLoading ? (
          <div className="admin-empty-state">
            <strong>Carregando agendamento...</strong>
          </div>
        ) : booking ? (
          <div className="admin-booking-page__content">
            <article className="admin-booking-page__hero">
              <span className="admin-status-pill">{booking.status}</span>
              <strong>{formatDateTime(booking.start)}</strong>
              <span>{formatValue(booking.clientAddressLine)}</span>
            </article>

            <div className="admin-booking-page__grid">
              <div className="admin-detail-block">
                <span>Nome</span>
                <strong>{formatValue(`${booking.clientFirstName} ${booking.clientLastName}`)}</strong>
              </div>
              <div className="admin-detail-block">
                <span>E-mail</span>
                <strong>{formatValue(booking.clientEmail)}</strong>
              </div>
              <div className="admin-detail-block">
                <span>Telefone</span>
                <strong>{formatValue(booking.clientPhone)}</strong>
              </div>
              <div className="admin-detail-block">
                <span>Serviço</span>
                <strong>{formatValue(booking.serviceType)}</strong>
              </div>
              <div className="admin-detail-block">
                <span>Cidade</span>
                <strong>{formatValue(booking.clientCity)}</strong>
              </div>
              <div className="admin-detail-block">
                <span>Estado</span>
                <strong>{formatValue(booking.clientState)}</strong>
              </div>
            </div>

            <div className="admin-booking-page__actions">
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                disabled={deleteMutation.isPending}
                onClick={async () => {
                  await removeBooking(booking.eventId);
                  navigate("/admin/dashboard", { replace: true });
                }}
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir agendamento"}
              </button>
            </div>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Agendamento não encontrado</strong>
            <span>Ele pode ter sido removido ou estar fora do intervalo visível.</span>
          </div>
        )}
      </section>
    </AdminDashboardShell>
  );
}
