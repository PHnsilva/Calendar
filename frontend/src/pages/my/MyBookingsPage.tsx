import { Link } from 'react-router-dom';
import { getManageTokens } from '../../lib/storage';
import { useMyBookings } from '../../features/bookings/hooks/useMyBookings';
import { BookingWorkspace } from '../../features/bookings/components/BookingWorkspace';
import AlertNotice from '../../components/ui/AlertNotice';

export default function MyBookingsPage() {
  const tokens = getManageTokens();
  const bookingsQuery = useMyBookings(tokens);

  if (tokens.length === 0) {
    return (
      <main className="my-bookings-page">
        <section className="my-bookings__panel">
          <h1>Meus agendamentos</h1>
          <AlertNotice variant="info" title="Nenhum acesso salvo neste navegador">
            <p>Recupere um atendimento por telefone ou inicie um novo agendamento.</p>
          </AlertNotice>
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

        {bookingsQuery.isLoading ? (
          <AlertNotice variant="info" title="Carregando seus atendimentos" compact>
            <p>Estamos buscando os dados vinculados aos acessos salvos neste navegador.</p>
          </AlertNotice>
        ) : null}

        {bookingsQuery.isError ? (
          <AlertNotice variant="danger" title="Não foi possível recuperar os agendamentos">
            <p>{(bookingsQuery.error as Error).message}</p>
          </AlertNotice>
        ) : null}

        {bookingsQuery.isError ? (
          <div className="my-bookings__actions">
            <Link to="/recover" className="secondary-action">Tentar recuperar novamente</Link>
          </div>
        ) : null}

        {bookingsQuery.data ? <BookingWorkspace bookings={bookingsQuery.data} /> : null}
      </section>
    </main>
  );
}
