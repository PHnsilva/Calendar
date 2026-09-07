import { useMemo, useState } from 'react';
import { useAdminHistory } from '../../features/admin/hooks/useAdminHistory';
import { getStoredAdminToken } from '../../lib/storage';
import { getBusinessTodayIso, shiftIsoCalendarDate, toBusinessDateTimeParts } from '../../lib/dates';
import type { ServicoResponse } from '../../types/api';
import { repairServiceEncoding } from '../../features/bookings/services/client-service-options';
import {
  AdminButton,
  AdminIcon,
  AdminPageHeader,
  AdminSectionHeader,
  AdminState,
  AdminStatusBadge,
  type AdminIconName,
} from './AdminWorkspaceUi';
import styles from './AdminWorkspaceUi.module.css';

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
  startsAt: number;
};

const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';
const ptDate = new Intl.DateTimeFormat('pt-BR', { timeZone: BUSINESS_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' });

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

function statusTone(status: string): 'danger' | 'info' | 'success' | 'warning' {
  const value = normalize(status);
  if (value.includes('cancel')) return 'danger';
  if (value.includes('pend')) return 'warning';
  if (value.includes('concl')) return 'success';
  return 'info';
}

function mapBooking(booking: ServicoResponse): HistoryBooking {
  const dateTime = toBusinessDateTimeParts(booking.start, BUSINESS_TIME_ZONE);
  return {
    id: booking.eventId,
    address: addressFromBooking(booking),
    client: fullClientName(booking),
    date: dateTime.date,
    email: booking.clientEmail || 'Não informado',
    notes: booking.serviceNotes || 'Sem observações registradas.',
    phone: booking.clientPhone || 'Não informado',
    provider: booking.assignedProviderName || 'A definir',
    service: repairServiceEncoding(booking.serviceType) || 'Serviço não informado',
    status: formatStatus(booking.status),
    time: dateTime.time || '--:--',
    startsAt: new Date(booking.start).getTime(),
  };
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SG';
  return <span className={styles.avatar} aria-hidden="true">{initials}</span>;
}

function DetailRow({ icon, label, value }: { icon: AdminIconName; label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailIcon}><AdminIcon name={icon} size={15} /></span>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function HistoryPanel() {
  const hasAdminToken = Boolean(getStoredAdminToken());
  const today = getBusinessTodayIso(BUSINESS_TIME_ZONE);
  const historyRange = { from: shiftIsoCalendarDate(today, -29), to: today };
  const query = useAdminHistory(historyRange, hasAdminToken);
  const [selectedId, setSelectedId] = useState('');
  const [client, setClient] = useState('ALL');
  const [provider, setProvider] = useState('ALL');
  const [search, setSearch] = useState('');

  const sourceBookings = useMemo(() => (query.data ?? []).map(mapBooking).sort((a, b) => b.startsAt - a.startsAt), [query.data]);
  const clientOptions = useMemo(() => Array.from(new Set(sourceBookings.map((booking) => booking.client))).sort(), [sourceBookings]);
  const providerOptions = useMemo(() => Array.from(new Set(sourceBookings.map((booking) => booking.provider))).sort(), [sourceBookings]);

  const filteredBookings = useMemo(() => {
    const term = normalize(search.trim());
    return sourceBookings.filter((booking) => {
      const byClient = client === 'ALL' || booking.client === client;
      const byProvider = provider === 'ALL' || booking.provider === provider;
      const bySearch = !term || normalize(`${booking.id} ${booking.client} ${booking.provider} ${booking.phone} ${booking.email} ${booking.address} ${booking.service} ${booking.notes}`).includes(term);
      return byClient && byProvider && bySearch;
    });
  }, [client, provider, search, sourceBookings]);

  const selected = filteredBookings.find((booking) => booking.id === selectedId) ?? filteredBookings[0];
  const filtersActive = client !== 'ALL' || provider !== 'ALL' || Boolean(search.trim());
  const clearFilters = () => {
    setClient('ALL');
    setProvider('ALL');
    setSearch('');
    setSelectedId('');
  };

  return (
    <section className={styles.page} aria-labelledby="admin-history-title">
      <div id="admin-history-title">
        <AdminPageHeader
          icon="history"
          title="Histórico"
          description="Consulte os atendimentos e cancelamentos dos últimos 30 dias e as informações registradas pelos clientes."
        />
      </div>

      <section className={styles.filters} aria-label="Filtros do histórico">
        <label className={styles.field}>
          <span className={styles.fieldLabel}><AdminIcon name="calendar" size={15} /> Período</span>
          <select className={styles.fieldControl} value="30" disabled>
            <option value="30">Últimos 30 dias</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}><AdminIcon name="user" size={15} /> Cliente</span>
          <select className={styles.fieldControl} value={client} onChange={(event) => setClient(event.target.value)}>
            <option value="ALL">Todos</option>
            {clientOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}><AdminIcon name="service" size={15} /> Prestador</span>
          <select className={styles.fieldControl} value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="ALL">Todos</option>
            {providerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}><AdminIcon name="search" size={15} /> Busca</span>
          <input className={styles.fieldControl} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, código, serviço ou observação" />
        </label>
        <div className={styles.filterActions}>
          <AdminButton icon="close" onClick={clearFilters} disabled={!filtersActive}>Limpar filtros</AdminButton>
        </div>
      </section>

      <div className={styles.historyLayout}>
        <section className={`${styles.panel} ${styles.historyList}`} aria-label="Atendimentos do histórico">
          <AdminSectionHeader
            icon="history"
            title="Atendimentos registrados"
            description="Selecione um registro para consultar os detalhes completos."
            meta={<AdminStatusBadge tone="info">{filteredBookings.length} registro(s)</AdminStatusBadge>}
          />

          {query.isFetching && filteredBookings.length === 0 ? <AdminState tone="loading" title="Carregando histórico" description="Buscando os atendimentos registrados." /> : null}
          {!hasAdminToken ? <AdminState tone="error" title="Não foi possível abrir o histórico" description="Entre novamente para acessar esta área administrativa." /> : null}
          {hasAdminToken && query.isError ? (
            <AdminState
              tone="error"
              title="Histórico indisponível"
              description="Não foi possível carregar os atendimentos agora. Tente novamente em instantes."
              action={<AdminButton icon="refresh" onClick={() => void query.refetch()}>Tentar novamente</AdminButton>}
            />
          ) : null}
          {!query.isFetching && !query.isError && hasAdminToken && filteredBookings.length === 0 ? (
            <AdminState
              title="Nenhum atendimento encontrado"
              description={filtersActive ? 'Ajuste ou limpe os filtros para consultar outros registros.' : 'Ainda não existem atendimentos para exibir neste período.'}
              action={filtersActive ? <AdminButton icon="close" onClick={clearFilters}>Limpar filtros</AdminButton> : undefined}
            />
          ) : null}

          {query.isFetching && filteredBookings.length > 0 ? <AdminState tone="loading" title="Atualizando histórico" description="Mantendo os registros atuais enquanto buscamos novidades." /> : null}

          {filteredBookings.map((booking) => (
            <button
              key={booking.id}
              type="button"
              className={`${styles.historyItem} ${booking.id === selected?.id ? styles.historyItemActive : ''}`}
              onClick={() => setSelectedId(booking.id)}
              aria-pressed={booking.id === selected?.id}
            >
              <span className={styles.historyCell}>
                <span className={styles.historyMeta}><AdminIcon name="calendar" size={15} />{ptDate.format(toLocalDate(booking.date))}</span>
                <span className={styles.historyMeta}><AdminIcon name="clock" size={15} />{booking.time}</span>
                <AdminStatusBadge tone={statusTone(booking.status)}>{booking.status}</AdminStatusBadge>
              </span>
              <span className={styles.historyCell}>
                <strong>{booking.client}</strong>
                <small>{booking.phone}</small>
                <small>{booking.service}</small>
                <small>Código: {booking.id}</small>
              </span>
              <span className={styles.historyCell}>
                <span className={styles.historyMeta}><Avatar name={booking.provider} /><strong>{booking.provider}</strong></span>
                <small>{booking.notes}</small>
              </span>
              <span className={styles.historyMeta}><AdminIcon name="eye" size={16} />Ver detalhes</span>
            </button>
          ))}
        </section>

        {selected ? (
          <aside className={`${styles.detailPanel} ${styles.detailsList}`} aria-label="Detalhes do atendimento">
            <div className={styles.personHeader}>
              <Avatar name={selected.provider} />
              <div>
                <h2>{selected.provider}</h2>
                <p>Prestador de serviços</p>
              </div>
              <AdminStatusBadge tone={statusTone(selected.status)}>{selected.status}</AdminStatusBadge>
            </div>
            <dl>
              <DetailRow icon="note" label="Agendamento" value={selected.id} />
              <DetailRow icon="user" label="Cliente" value={selected.client} />
              <DetailRow icon="service" label="Serviço" value={selected.service} />
              <DetailRow icon="user" label="Telefone" value={selected.phone} />
              <DetailRow icon="mail" label="E-mail" value={selected.email} />
              <DetailRow icon="service" label="Prestador" value={selected.provider} />
              <DetailRow icon="calendar" label="Data e horário" value={`${ptDate.format(toLocalDate(selected.date))} às ${selected.time}`} />
              <DetailRow icon="location" label="Endereço" value={selected.address} />
              <DetailRow icon="note" label="Observações" value={selected.notes} />
            </dl>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
