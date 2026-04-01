import type { RouteOption } from "../../../types/route";
import { buildStaticRouteMapUrl } from "../utils/map-formatters";

type RouteMapProps = {
  route: RouteOption | null | undefined;
};

export default function RouteMap({ route }: RouteMapProps) {
  const staticMapUrl = buildStaticRouteMapUrl(route);

  if (!staticMapUrl) {
    return (
      <div className="admin-route-map admin-route-map--empty">
        <strong>Mapa indisponível</strong>
        <span>Não foi possível montar a visualização da rota.</span>
      </div>
    );
  }

  return (
    <div className="admin-route-map">
      <img src={staticMapUrl} alt="Mapa com a rota calculada do atendimento" className="admin-route-map__image" />
      <p className="admin-route-map__attribution">
        Powered by Geoapify · © OpenStreetMap contributors · © OpenMapTiles
      </p>
    </div>
  );
}
