import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookingWorkspace } from "../../features/bookings/components/BookingWorkspace";
import { useBookingMutations } from "../../features/bookings/hooks/useBookingMutations";
import { useMyBookings } from "../../features/bookings/hooks/useMyBookings";
import { RecoveryEmptyState } from "../../features/recovery/components/RecoveryEmptyState";
import { getStoredManageToken, saveManageToken } from "../../lib/storage";
import type { ServicoRequest } from "../../types/api";

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";
  const [token, setToken] = useState(tokenFromUrl || getStoredManageToken());
  const [selectedEventId, setSelectedEventId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenFromUrl) return;
    saveManageToken(tokenFromUrl);
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const bookingsQuery = useMyBookings(token, Boolean(token));
  const { updateMutation, deleteMutation } = useBookingMutations(token);

  const bookings = bookingsQuery.data ?? [];

  useEffect(() => {
    if (!selectedEventId && bookings[0]?.eventId) {
      setSelectedEventId(bookings[0].eventId);
    }
  }, [bookings, selectedEventId]);

  const hasToken = Boolean(token.trim());
  const hasBookings = bookings.length > 0;

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.eventId === selectedEventId) ?? bookings[0] ?? null,
    [bookings, selectedEventId],
  );

  const handleSave = async (eventId: string, payload: ServicoRequest) => {
    await updateMutation.mutateAsync({ eventId, payload });
    setFeedback("Agendamento atualizado com sucesso.");
  };

  const handleDelete = async (eventId: string) => {
    await deleteMutation.mutateAsync(eventId);
    setFeedback("Agendamento cancelado com sucesso.");
    setSelectedEventId("");
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 16 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.65 }}>Sprint 2</span>
        <h1 style={{ margin: 0 }}>Meus agendamentos</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>
          Listagem real por token, com edição e cancelamento usando os endpoints já expostos pelo backend.
        </p>
      </header>

      {feedback ? (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(22,163,74,.08)", color: "#166534" }}>
          {feedback}
        </div>
      ) : null}

      {!hasToken ? (
        <>
          <RecoveryEmptyState />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="primary-action" onClick={() => navigate("/recover")}>Recuperar por telefone</button>
          </div>
        </>
      ) : null}

      {hasToken && bookingsQuery.isLoading ? <div>Carregando agendamentos...</div> : null}
      {hasToken && bookingsQuery.error ? (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(220,38,38,.08)", color: "#991b1b" }}>
          {bookingsQuery.error.message}
        </div>
      ) : null}

      {hasToken && !bookingsQuery.isLoading && !hasBookings ? (
        <section style={{ display: "grid", gap: 12, border: "1px dashed rgba(15,23,42,.2)", borderRadius: 20, padding: 18, background: "white" }}>
          <strong>Nenhum agendamento encontrado</strong>
          <span style={{ opacity: 0.8 }}>Esse token não retornou agendamentos ativos para exibição.</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="secondary-action" onClick={() => navigate("/recover")}>Tentar outro telefone</button>
          </div>
        </section>
      ) : null}

      {hasToken && hasBookings ? (
        <BookingWorkspace
          bookings={bookings}
          selectedEventId={selectedBooking?.eventId}
          onSelect={setSelectedEventId}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      ) : null}
    </main>
  );
}
