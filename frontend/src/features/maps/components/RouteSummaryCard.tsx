import type { RouteOption } from "../../../types/route";
import { formatDistance, formatDuration } from "../utils/map-formatters";

type RouteSummaryCardProps = {
  route?: RouteOption | null;
};

export default function RouteSummaryCard({ route }: RouteSummaryCardProps) {
  return (
    <div className="route-summary-card">
      <div className="route-summary-card__item">
        <span>Distância</span>
        <strong>{formatDistance(route?.distanceMeters)}</strong>
      </div>
      <div className="route-summary-card__item">
        <span>Tempo estimado</span>
        <strong>{formatDuration(route?.durationSeconds)}</strong>
      </div>
    </div>
  );
}
