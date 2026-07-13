import type { ReactNode } from "react";
import styles from "./AppointmentCard.module.css";

export type AppointmentCardAccent = "blue" | "orange" | "green" | "purple" | "cyan" | "red" | "gray";

export type AppointmentCardItem = {
  address: string;
  city?: string;
  color: AppointmentCardAccent;
  date: string;
  day: string;
  endTime?: string;
  id: string;
  month: string;
  name: string;
  notes?: string;
  phone: string;
  provider?: string;
  providerPhone?: string;
  service: string;
  status: string;
  time: string;
  weekday: string;
};

type AppointmentCardProps = {
  admin?: boolean;
  appointment: AppointmentCardItem;
  canAssign?: boolean;
  className?: string;
  formatCreatedDate: (date: string) => string;
  formatPhone?: (phone: string) => string;
  onAssign?: () => void;
  onCancel?: () => void;
  onDetails?: () => void;
  onEdit?: () => void;
  onWhatsApp?: (phone: string) => void;
  renderIcon: (name: string) => ReactNode;
  renderStatus?: (status: string) => ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function InfoLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className={styles.infoLine}>
      {icon}
      <span>{children}</span>
    </p>
  );
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaIcon}>{icon}</span>
      <div className={styles.metaText}>
        <b>{label}</b>
        <small>{value}</small>
      </div>
    </div>
  );
}

export function AppointmentCard({
  admin,
  appointment,
  canAssign = true,
  className,
  formatCreatedDate,
  formatPhone = (phone) => phone,
  onAssign,
  onCancel,
  onDetails,
  onEdit,
  onWhatsApp,
  renderIcon,
  renderStatus,
}: AppointmentCardProps) {
  const createdAt = formatCreatedDate(appointment.date);
  const reminderAt = `${formatCreatedDate(appointment.date)} às 08:00`;
  const providerName = appointment.provider || "A definir";
  const providerPhone = appointment.providerPhone || appointment.phone;
  const showAssign = admin && canAssign;

  return (
    <article className={cx(styles.root, className)} data-accent={appointment.color}>
      <aside className={styles.dateTile}>
        <small>{appointment.weekday}</small>
        <strong>{appointment.day}</strong>
        <span>{appointment.month}</span>
        <em>{renderIcon("clock")} {appointment.time}</em>
      </aside>

      <div className={styles.content}>
        <div className={styles.headerRow}>
          <div className={styles.customer}>
            <h2>{appointment.name}</h2>
            <InfoLine icon={renderIcon("booking-field-phone")}>{formatPhone(appointment.phone) || "Telefone não informado"}</InfoLine>
            <InfoLine icon={renderIcon("booking-field-location")}>{appointment.address}</InfoLine>
            <InfoLine icon={renderIcon("booking-field-service")}>{appointment.service}</InfoLine>
          </div>

          <div className={styles.provider}>
            <strong>Prestador designado</strong>
            <InfoLine icon={renderIcon("booking-field-user")}>{providerName}</InfoLine>
            <p className={styles.providerPhone}>{formatPhone(providerPhone)}</p>
          </div>

          <div className={styles.statusBox}>
            {renderStatus ? renderStatus(appointment.status) : <span>{appointment.status}</span>}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={cx(styles.action, styles.details)} onClick={onDetails}>{renderIcon("booking-action-eye")} <span>Detalhes</span></button>
          <button type="button" className={cx(styles.action, styles.edit)} onClick={onEdit}>{renderIcon("booking-action-pencil")} <span>Editar</span></button>
          <button type="button" className={cx(styles.action, styles.whatsapp)} onClick={() => onWhatsApp?.(appointment.phone)}>{renderIcon("booking-action-whatsapp")} <span>Tirar dúvidas</span></button>
          {showAssign ? (
            <button type="button" className={cx(styles.action, styles.assign)} onClick={onAssign}>{renderIcon("booking-action-provider")} <span>Designar prestador</span></button>
          ) : (
            <button type="button" className={cx(styles.action, styles.cancel)} onClick={onCancel}>{renderIcon("booking-action-cancel")} <span>Cancelar</span></button>
          )}
        </div>

        <div className={styles.meta}>
          <div className={styles.metaColumn}>
            <MetaItem icon={renderIcon("booking-meta-tools")} label="Prestador" value={providerName} />
            <MetaItem icon={renderIcon("booking-meta-calendar")} label="Criado em" value={`${createdAt} às 14:32`} />
          </div>

          <div className={styles.metaColumn}>
            <MetaItem icon={renderIcon("booking-meta-clock")} label="Horário" value={appointment.endTime ? `${appointment.time}-${appointment.endTime}` : appointment.time} />
            <MetaItem icon={renderIcon("booking-meta-note")} label="Observações internas" value={appointment.notes || "Cliente solicitou orçamento pela manhã."} />
          </div>

          <div className={styles.metaColumn}>
            <MetaItem icon={renderIcon("booking-field-user")} label="Cliente" value={appointment.name} />
            <MetaItem icon={renderIcon("booking-meta-bell")} label="Lembrete" value={reminderAt} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default AppointmentCard;
