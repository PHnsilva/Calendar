import { useMemo, useState } from 'react';
import historyIcon from '../../assets/wireframes/icons/admin-history-clock.png';
import { useAdminBookings } from '../../features/admin/hooks/useAdminBookings';
import { getStoredAdminToken } from '../../lib/storage';
import type { ServicoResponse } from '../../types/api';

type PeriodFilter = '30' | '90' | 'ALL';

type HistoryBooking = {
  id: string;
  address: string;
  client: string;
  date: string;
  email: string;
  notes: string;
  phone: string;
  provider: string;
  service: string;
  status: string;
  time: string;
};

const ptDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function toLocalDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function fullClientName(booking: ServicoResponse): string {
  return `${booking.clientFirstName ?? ''} ${booking.clientLastName ?? ''}`.trim() || 'Cliente não informado';
}

function addressFromBooking(booking: ServicoResponse): string {
  return booking.clientAddressLine || [booking.clientStreet, booking.clientNumber, booking.clientNeighborhood, booking.clientCity, booking.clientState].filter(Boolean).join(' - ') || 'Endereço não informado';
}

function formatStatus(status?: string): string {
  const value = normalize(status ?? '');
  if (value.includes('concl') || value.includes('done') || value.includes('complete')) return 'Concluído';
  if (value.includes('cancel')) return 'Cancelado';
  if (value.includes('pend')) return 'Pendente';
  return 'Confirmado';
}

function isCompleted(status: string): boolean {
  return normalize(status).includes('concl') || normalize(status).includes('complete') || normalize(status).includes('done');
}

function mapBooking(booking: ServicoResponse): HistoryBooking {
  const date = booking.start?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return {
    id: booking.eventId,
    address: addressFromBooking(booking),
    client: fullClientName(booking),
    date,
    email: booking.clientEmail || 'Não informado',
    notes: booking.serviceType || 'Sem observações registradas.',
    phone: booking.clientPhone || 'Não informado',
    provider: booking.assignedProviderName || 'A definir',
    service: booking.serviceType || 'Serviço não informado',
    status: formatStatus(booking.status),
    time: booking.start?.slice(11, 16) || '--:--',
  };
}

function inPeriod(booking: HistoryBooking, period: PeriodFilter): boolean {
  if (period === 'ALL') return true;
  const days = Number(period);
  const floor = new Date();
  floor.setDate(floor.getDate() - days);
  return toLocalDate(booking.date).getTime() >= new Date(floor.getFullYear(), floor.getMonth(), floor.getDate()).getTime();
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SG';
  return <span className="admin-history-avatar" aria-hidden="true">{initials}</span>;
}

export function HistoryPanel() {
  const hasAdminToken = Boolean(getStoredAdminToken());
  const query = useAdminBookings({}, hasAdminToken);
  const [selectedId, setSelectedId] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('30');
  const [client, setClient] = useState('ALL');
  const [provider, setProvider] = useState('ALL');
  const [search, setSearch] = useState('');

  const allBookings = useMemo(() => (query.data ?? []).map(mapBooking).sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)), [query.data]);
  const completedBookings = useMemo(() => allBookings.filter((booking) => isCompleted(booking.status)), [allBookings]);
  const sourceBookings = completedBookings.length ? completedBookings : allBookings;
  const clientOptions = useMemo(() => Array.from(new Set(sourceBookings.map((booking) => booking.client))).sort(), [sourceBookings]);
  const providerOptions = useMemo(() => Array.from(new Set(sourceBookings.map((booking) => booking.provider))).sort(), [sourceBookings]);

  const filteredBookings = useMemo(() => {
    const term = normalize(search.trim());
    return sourceBookings.filter((booking) => {
      const byPeriod = inPeriod(booking, period);
      const byClient = client === 'ALL' || booking.client === client;
      const byProvider = provider === 'ALL' || booking.provider === provider;
      const bySearch = !term || normalize(`${booking.id} ${booking.client} ${booking.provider} ${booking.phone} ${booking.email} ${booking.address} ${booking.service} ${booking.notes}`).includes(term);
      return byPeriod && byClient && byProvider && bySearch;
    });
  }, [client, period, provider, search, sourceBookings]);

  const selected = filteredBookings.find((booking) => booking.id === selectedId) ?? filteredBookings[0] ?? sourceBookings[0];

  return (
    <section className="wf-admin-section admin-history-panel admin-history-panel--wireframe" aria-label="Histórico de agendamentos">
      <header className="admin-panel-header admin-panel-header--plain">
        <span className="admin-panel-header__icon"><img src={historyIcon} alt="" /></span>
        <div>
          <h1>Histórico</h1>
          <p>Consulte os agendamentos já concluídos e as informações registradas pelos clientes.</p>
        </div>
      </header>

      <section className="admin-history-filters" aria-label="Filtros do histórico">
        <label>
          <span>Período</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="ALL">Todo o histórico</option>
          </select>
        </label>
        <label>
          <span>Cliente</span>
          <select value={client} onChange={(event) => setClient(event.target.value)}>
            <option value="ALL">Todos</option>
            {clientOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Prestador</span>
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="ALL">Todos</option>
            {providerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Busca</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cliente, agendamento ou observação..." />
        </label>
      </section>

      <div className="admin-history-wireframe-layout">
        <section className="admin-history-results" aria-label="Agendamentos concluídos">
          <div className="admin-section-heading">
            <div>
              <h2>{completedBookings.length ? 'Agendamentos concluídos' : 'Agendamentos carregados'}</h2>
              <p>{filteredBookings.length} registro(s) reais do sistema</p>
            </div>
            <strong>Mais recentes</strong>
          </div>

          {query.isFetching ? <p className="admin-transaction-empty">Carregando historico.</p> : null}
          {!hasAdminToken ? <p className="admin-transaction-empty">Faça login administrativo para carregar o histórico.</p> : null}
          {!query.isFetching && filteredBookings.length === 0 ? <p className="admin-transaction-empty">Nenhum agendamento encontrado para os filtros selecionados.</p> : null}

          <div className="admin-history-card-list">
            {filteredBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                className={booking.id === selected?.id ? 'is-active' : ''}
                onClick={() => setSelectedId(booking.id)}
              >
                <span className="admin-history-date"><strong>{ptDate.format(toLocalDate(booking.date))}</strong><em>{booking.time}</em><i>{booking.status}</i></span>
                <span className="admin-history-client"><strong>{booking.client}</strong><small>{booking.phone}</small><em>{booking.notes}</em><b>Código: {booking.id}</b></span>
                <span className="admin-history-provider"><Avatar name={booking.provider} /><strong>{booking.provider}</strong></span>
                <span className="admin-history-details">Ver detalhes</span>
              </button>
            ))}
          </div>
        </section>

        {selected ? (
          <aside className="admin-history-selected" aria-label="Detalhes do atendimento">
            <div className="admin-history-selected__person">
              <Avatar name={selected.provider} />
              <div>
                <h2>{selected.provider}</h2>
                <p>Prestador de Serviços</p>
                <span>{selected.status}</span>
              </div>
            </div>
            <dl>
              <dt>Agendamento</dt><dd>{selected.id}</dd>
              <dt>Cliente</dt><dd>{selected.client}</dd>
              <dt>Telefone</dt><dd>{selected.phone}</dd>
              <dt>E-mail</dt><dd>{selected.email}</dd>
              <dt>Prestador que atendeu</dt><dd>{selected.provider}</dd>
              <dt>Data / Hora do atendimento</dt><dd>{ptDate.format(toLocalDate(selected.date))} às {selected.time}</dd>
              <dt>Endereço</dt><dd>{selected.address}</dd>
              <dt>Observações do cliente</dt><dd>{selected.notes}</dd>
            </dl>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
