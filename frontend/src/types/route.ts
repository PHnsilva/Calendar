export type RouteGeometry = {
  type?: string;
  coordinates?: number[][][];
};

export type RouteOption = {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string | null;
  geometry?: RouteGeometry | null;
};

export type RouteComputeResponse = {
  primary?: RouteOption | null;
  alternative?: RouteOption | null;
};
