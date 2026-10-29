import type { Coordinates } from './reports';

/** Fixed physical radius, independent of screen zoom or the number of reports. */
export const HEAT_RADIUS_METERS = 30;

/** One report contributes 1 at its location; nearby contributions add together. */
export function collectiveDensityAt(point: Coordinates, reports: ReadonlyArray<Coordinates>, radiusMeters = HEAT_RADIUS_METERS): number {
  let total = 0;
  const latitudeRadians = point.latitude * Math.PI / 180;
  for (const report of reports) {
    const northMeters = (point.latitude - report.latitude) * 111_195;
    const eastMeters = (point.longitude - report.longitude) * 111_195 * Math.cos(latitudeRadians);
    const distanceSquared = northMeters * northMeters + eastMeters * eastMeters;
    // Outside three radii the Gaussian is visually negligible.
    if (distanceSquared <= 9 * radiusMeters * radiusMeters) {
      total += Math.exp(-distanceSquared / (2 * radiusMeters * radiusMeters));
    }
  }
  return total;
}

/** Strengthen overlap without enlarging the physical footprint of isolated reports. */
export function displayHeatDensity(density: number): number {
  return density <= 1 ? density : 1 + (density - 1) * 1.4;
}

type ColorStop = { density: number; red: number; green: number; blue: number; alpha: number };

/** Absolute density stops. Never normalize against the current dataset's maximum. */
const HEAT_STOPS: readonly ColorStop[] = [
  { density: 0.08, red: 220, green: 38, blue: 38, alpha: 0 },
  { density: 0.35, red: 220, green: 38, blue: 38, alpha: 0.06 },
  { density: 1, red: 220, green: 38, blue: 38, alpha: 0.12 },
  { density: 2, red: 220, green: 38, blue: 38, alpha: 0.25 },
  { density: 3.5, red: 220, green: 38, blue: 38, alpha: 0.38 },
  { density: 5.5, red: 220, green: 38, blue: 38, alpha: 0.45 },
  { density: 8, red: 220, green: 38, blue: 38, alpha: 0.52 },
];

export function heatColorAt(density: number): [number, number, number, number] {
  if (density < HEAT_STOPS[0].density) return [0, 0, 0, 0];
  const last = HEAT_STOPS[HEAT_STOPS.length - 1];
  if (density >= last.density) return [last.red, last.green, last.blue, Math.round(last.alpha * 255)];
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const high = HEAT_STOPS[i];
    if (density > high.density) continue;
    const low = HEAT_STOPS[i - 1];
    const t = (density - low.density) / (high.density - low.density);
    return [
      Math.round(low.red + (high.red - low.red) * t),
      Math.round(low.green + (high.green - low.green) * t),
      Math.round(low.blue + (high.blue - low.blue) * t),
      Math.round((low.alpha + (high.alpha - low.alpha) * t) * 255),
    ];
  }
  return [0, 0, 0, 0];
}