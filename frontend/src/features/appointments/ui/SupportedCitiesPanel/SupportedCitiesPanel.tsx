import styles from "./SupportedCitiesPanel.module.css";

export type SupportedCityItem = {
  color: string;
  icon: string;
  name: string;
};

type SupportedCitiesPanelProps = {
  admin?: boolean;
  cities: SupportedCityItem[];
  className?: string;
  panelIcon: string;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function SupportedCitiesPanel({ admin, cities, className, panelIcon }: SupportedCitiesPanelProps) {
  return (
    <div className={cx(styles.root, admin && styles.admin, className)}>
      <span className={styles.media} aria-hidden="true">
        <img src={panelIcon} alt="" />
      </span>

      <div className={styles.content}>
        <h3>Cidades atendidas</h3>

        <div className={styles.list}>
          {cities.map((city) => (
            <span key={city.name} className={cx(styles.cityPill, styles[`cityPill_${city.color}`])}>
              <img src={city.icon} alt="" aria-hidden="true" />
              <span>{city.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SupportedCitiesPanel;
