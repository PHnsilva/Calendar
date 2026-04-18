import { Link } from "react-router-dom";
import { getManageTokens } from "../../lib/storage";
import { useMyBookings } from "../../features/bookings/hooks/useMyBookings";
import { BookingWorkspace } from "../../features/bookings/components/BookingWorkspace";

export default function MyBookingsPage() {
  const tokens = getManageTokens();
  const bookingsQuery = useMyBookings(tokens);

  if (tokens.length === 0) {
    return (
      <main className="my-bookings-page">
        <section className="my-bookings__panel">
          <h1>Meus agendamentos</h1>
          <p>Este navegador ainda não tem acesso salvo a nenhum atendimento.</p>
          <div className="my-bookings__actions">
            <Link to="/recover" className="primary-action">Recuperar acesso</Link>
            <Link to="/" className="secondary-action">Novo agendamento</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="my-bookings-page">
      <section className="my-bookings__panel">
        <div className="my-bookings__panel-header">
          <div>
            <h1>Meus agendamentos</h1>
            <p>Veja seus atendimentos e gerencie o que ainda estiver dentro das regras de alteração.</p>
          </div>
          <Link to="/recover" className="secondary-action">Recuperar outro telefone</Link>
        </div>

        {bookingsQuery.isLoading ? <p className="my-bookings__empty">Carregando agendamentos...</p> : null}
        {bookingsQuery.isError ? (
          <div className="my-bookings__empty">
            <p>{(bookingsQuery.error as Error).message}</p>
            <Link to="/recover" className="secondary-action">Tentar recuperar novamente</Link>
          </div>
        ) : null}
        {bookingsQuery.data ? <BookingWorkspace bookings={bookingsQuery.data} /> : null}
      </section>
    </main>
  );
}
