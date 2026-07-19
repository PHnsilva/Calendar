import { useMemo, useState } from 'react';
import type { AvailabilityBlockResponse } from '../../types/api';
import { usePublicBootstrap } from '../../features/public-config/hooks/usePublicBootstrap';
import { is4x4UnavailableDate } from '../../features/calendar/utils/schedule-rules';
import {
  AdminButton,
  AdminIcon,
  AdminPageHeader,
  AdminSectionHeader,
  AdminState,
  AdminStatusBadge,
} from './AdminWorkspaceUi';
import styles from './AdminWorkspaceUi.module.css';

type AdminBlocksPanelProps = {
  blocks: AvailabilityBlockResponse[];
  deletingId: string;
  hasAdminToken: boolean;
  isError: boolean;
  isLoading: boolean;
  onDelete: (blockId: string) => void | Promise<void>;
  onOpenEditor: () => void;
};

type BlockFilters = {
  from: string;
  professional: string;
  search: string;
  to: string;
};

const emptyFilters: BlockFilters = { from: '', professional: 'ALL', search: '', to: '' };
const ptLongDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function blockDate(block: AvailabilityBlockResponse): string {
  return block.start?.slice(0, 10) || block.end?.slice(0, 10) || '';
}

function formatBlockDate(block: AvailabilityBlockResponse): string {
  const date = blockDate(block);
  return date ? ptLongDate.format(toLocalDate(date)) : 'Data não informada';
}

function formatBlockTime(block: AvailabilityBlockResponse): string {
  if (block.type?.toLowerCase() === 'day' || !block.start || !block.end) return 'Dia inteiro';
  return `${block.start.slice(11, 16)} - ${block.end.slice(11, 16)}`;
}

function isFullDay(block: AvailabilityBlockResponse): boolean {
  return block.type?.toLowerCase() === 'day';
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function buildMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      day: date.getDate(),
      iso: toIsoDate(date),
      isCurrentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function BlockCalendar({ blocks }: { blocks: AvailabilityBlockResponse[] }) {
  const [month, setMonth] = useState(() => new Date());
  const { data: bootstrap } = usePublicBootstrap();
  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const blockedDates = useMemo(() => new Set(blocks.map(blockDate).filter(Boolean)), [blocks]);
  const cycleStart = bootstrap?.schedule?.cycleStart;
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month);

  const moveMonth = (delta: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <section className={styles.calendarPanel} aria-label="Calendário de bloqueios">
      <AdminSectionHeader icon="calendar" title="Calendário mensal" />
      <div className={styles.calendarBody}>
        <div className={styles.calendarHeader}>
          <button type="button" className={styles.calendarNav} onClick={() => moveMonth(-1)} aria-label="Mês anterior">
            <AdminIcon name="chevron-left" size={18} />
          </button>
          <strong>{label}</strong>
          <button type="button" className={styles.calendarNav} onClick={() => moveMonth(1)} aria-label="Próximo mês">
            <AdminIcon name="chevron-right" size={18} />
          </button>
        </div>
        <div className={styles.calendarGrid}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <b key={day}>{day}</b>)}
          {grid.map((item) => (
            <span
              key={item.iso}
              className={`${styles.calendarDay} ${!item.isCurrentMonth ? styles.calendarDayMuted : ''} ${is4x4UnavailableDate(item.iso, cycleStart) ? styles.calendarDayScheduleBlocked : ''} ${blockedDates.has(item.iso) ? styles.calendarDayBlocked : ''}`}
              aria-label={`${item.iso}${is4x4UnavailableDate(item.iso, cycleStart) ? ', indisponível pela escala 4x4' : ''}${blockedDates.has(item.iso) ? ', com bloqueio manual' : ''}`}
            >
              {item.day}
            </span>
          ))}
        </div>
        <div className={styles.calendarLegends} aria-label="Legenda do calendário">
          <p className={styles.calendarLegend}>Bloqueio manual</p>
          <p className={`${styles.calendarLegend} ${styles.calendarLegendSchedule}`}>Escala 4x4</p>
        </div>
      </div>
    </section>
  );
}

export function AdminBlocksPanel({
  blocks,
  deletingId,
  hasAdminToken,
  isError,
  isLoading,
  onDelete,
  onOpenEditor,
}: AdminBlocksPanelProps) {
  const [draftFilters, setDraftFilters] = useState<BlockFilters>(emptyFilters);
  const [filters, setFilters] = useState<BlockFilters>(emptyFilters);

  const filteredBlocks = useMemo(() => {
    const term = normalize(filters.search.trim());
    return blocks.filter((block) => {
      const date = blockDate(block);
      const byProfessional = filters.professional === 'ALL' || filters.professional === 'ADMIN';
      const byFrom = !filters.from || !date || date >= filters.from;
      const byTo = !filters.to || !date || date <= filters.to;
      const bySearch = !term || normalize(`${formatBlockDate(block)} ${formatBlockTime(block)} ${block.reason ?? ''} Administrativo`).includes(term);
      return byProfessional && byFrom && byTo && bySearch;
    });
  }, [blocks, filters]);

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  };

  const viewDetails = (block: AvailabilityBlockResponse) => {
    window.alert(`${formatBlockDate(block)}\n${formatBlockTime(block)}\n${block.reason || 'Sem observação'}`);
  };

  const filtersActive = Object.entries(filters).some(([key, value]) => key === 'professional' ? value !== 'ALL' : Boolean(value));

  return (
    <section className={styles.page} aria-labelledby="admin-blocks-title">
      <div id="admin-blocks-title">
        <AdminPageHeader
          icon="lock"
          title="Bloqueios detalhados"
          description="Visualize e gerencie os dias e horários marcados como indisponíveis na agenda."
          actions={<AdminButton icon="plus" tone="primary" onClick={onOpenEditor}>Novo bloqueio</AdminButton>}
        />
      </div>

      <form
        className={styles.filters}
        aria-label="Filtros de bloqueios"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters(draftFilters);
        }}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}><AdminIcon name="user" size={15} /> Profissional</span>
          <select className={styles.fieldControl} value={draftFilters.professional} onChange={(event) => setDraftFilters((current) => ({ ...current, professional: event.target.value }))}>
            <option value="ALL">Todos</option>
            <option value="ADMIN">Administrativo</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}><AdminIcon name="calendar" size={15} /> Data inicial</span>
          <input className={styles.fieldControl} type="date" value={draftFilters.from} onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}><AdminIcon name="calendar" size={15} /> Data final</span>
          <input className={styles.fieldControl} type="date" value={draftFilters.to} onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}><AdminIcon name="search" size={15} /> Busca</span>
          <input className={styles.fieldControl} value={draftFilters.search} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Data, horário ou observação" />
        </label>
        <div className={styles.filterActions}>
          <AdminButton icon="filter" type="submit" tone="primary">Filtrar</AdminButton>
          <AdminButton icon="close" type="button" onClick={clearFilters} disabled={!filtersActive && !Object.values(draftFilters).some((value) => value && value !== 'ALL')}>Limpar</AdminButton>
        </div>
      </form>

      <div className={styles.splitLayout}>
        <section className={`${styles.panel} ${styles.mainColumn}`} aria-label="Lista de bloqueios">
          <AdminSectionHeader
            icon="lock"
            title="Lista de bloqueios"
            description="Todos os dados e ações continuam disponíveis em desktop e mobile."
            meta={<AdminStatusBadge tone="info">{filteredBlocks.length} registro(s)</AdminStatusBadge>}
          />

          {isLoading ? <AdminState tone="loading" title="Carregando bloqueios" description="Buscando as indisponibilidades da agenda." /> : null}
          {!hasAdminToken ? <AdminState tone="error" title="Não foi possível abrir os bloqueios" description="Entre novamente para acessar esta área administrativa." /> : null}
          {hasAdminToken && isError ? <AdminState tone="error" title="Bloqueios indisponíveis" description="Não foi possível carregar os dados agora. Tente novamente em instantes." /> : null}
          {!isLoading && !isError && hasAdminToken && filteredBlocks.length === 0 ? (
            <AdminState
              title={filtersActive ? 'Nenhum bloqueio corresponde aos filtros' : 'Nenhum bloqueio cadastrado'}
              description={filtersActive ? 'Ajuste ou limpe os filtros para consultar outros períodos.' : 'A agenda está livre no período consultado.'}
              action={filtersActive
                ? <AdminButton icon="close" onClick={clearFilters}>Limpar filtros</AdminButton>
                : <AdminButton icon="plus" tone="primary" onClick={onOpenEditor}>Adicionar bloqueio</AdminButton>}
            />
          ) : null}

          {!isLoading && !isError && hasAdminToken && filteredBlocks.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Profissional</th>
                    <th style={{ width: '17%' }}>Data</th>
                    <th style={{ width: '14%' }}>Horário</th>
                    <th>Observação</th>
                    <th style={{ width: '28%' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlocks.map((block) => (
                    <tr key={block.blockId}>
                      <td data-label="Profissional"><span className={styles.tablePrimary}><AdminIcon className={styles.cellIcon} name="user" size={17} />Administrativo</span></td>
                      <td data-label="Data"><span className={styles.tablePrimary}><AdminIcon className={styles.cellIcon} name="calendar" size={17} />{formatBlockDate(block)}</span></td>
                      <td data-label="Horário"><AdminStatusBadge tone={isFullDay(block) ? 'warning' : 'info'}>{formatBlockTime(block)}</AdminStatusBadge></td>
                      <td data-label="Observação">{block.reason || 'Sem observação'}</td>
                      <td data-label="Ações">
                        <span className={styles.rowActions}>
                          <AdminButton icon="eye" tone="text" onClick={() => viewDetails(block)}>Detalhes</AdminButton>
                          <AdminButton icon="edit" tone="text" onClick={onOpenEditor}>Editar</AdminButton>
                          <AdminButton icon="delete" tone="danger" onClick={() => void onDelete(block.blockId)} disabled={Boolean(deletingId)}>
                            {deletingId === block.blockId ? 'Excluindo...' : 'Excluir'}
                          </AdminButton>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <aside className={styles.sideColumn} aria-label="Resumo dos bloqueios">
          <BlockCalendar blocks={blocks} />
          <section className={`${styles.panel} ${styles.mainColumn}`}>
            <AdminSectionHeader icon="clock" title="Próximos horários" description="Visão rápida das indisponibilidades carregadas." />
            {filteredBlocks.length ? filteredBlocks.slice(0, 4).map((block) => (
              <div className={styles.detailRow} key={block.blockId}>
                <span className={styles.detailIcon}><AdminIcon name="calendar" size={15} /></span>
                <strong>{formatBlockDate(block)}</strong>
                <AdminStatusBadge tone={isFullDay(block) ? 'warning' : 'info'}>{formatBlockTime(block)}</AdminStatusBadge>
              </div>
            )) : <p className={styles.cardCopy}>Nenhum horário bloqueado para exibir.</p>}
            <AdminButton icon="plus" tone="primary" onClick={onOpenEditor}>Adicionar horário</AdminButton>
          </section>
        </aside>
      </div>
    </section>
  );
}
