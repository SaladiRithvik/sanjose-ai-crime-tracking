/**
 * Downtown anchors from OpenStreetMap nodes 2671872266, 313250792,
 * 3646391919, way 24168622 and relations 14641921, 5325236.
 * Retrieved through api.openstreetmap.org/api/0.6/map on 2026-10-03.
 * OpenStreetMap contributors, ODbL. Neighborhood labels are area references.
 */
export const DOWNTOWN_LANDMARKS = [
  { name: 'San Pedro Square', latitude: 37.3368467, longitude: -121.894112, labelOffset: [0, -24] },
  { name: 'St. James Park', latitude: 37.3388874, longitude: -121.8911815, labelOffset: [0, 0] },
  { name: 'City Hall', latitude: 37.3376477, longitude: -121.8859389, labelOffset: [0, -20] },
  { name: 'SoFA District', latitude: 37.3295863, longitude: -121.8858337, labelOffset: [0, -20] },
  { name: 'Convention Center', latitude: 37.3289602, longitude: -121.8887737, labelOffset: [0, 0] },
  { name: 'Diridon Station', latitude: 37.3299203, longitude: -121.902496, labelOffset: [0, -20] },
] as const;

export const PUBLIC_MAP_BOUNDS: [number, number][] = [[37.3278, -121.9045], [37.3402, -121.8762]];
export const DOWNTOWN_BOUNDS: [number, number][] = [[37.3278, -121.9045], [37.3402, -121.884]];
export const CAMPUS_AREA_LABEL = {
  name: 'SJSU Campus', latitude: 37.3352, longitude: -121.8811, labelOffset: [0, 0],
} as const;

export function insideCampus(latitude: number, longitude: number, boundary: ReadonlyArray<readonly [number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const [yi, xi] = boundary[i], [yj, xj] = boundary[j];
    if ((yi > latitude) !== (yj > latitude) && longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}