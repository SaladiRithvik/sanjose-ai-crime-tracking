/**
 * Geographic reference values are intentionally separate from the map rendering.
 * A future campus-map PDF may refine reference labels and boundaries; OSM remains
 * the geographic basemap and submitted coordinates remain the report locations.
 */
export const SJSU_MAP_CENTER = { latitude: 37.3352, longitude: -121.8811 } as const;
export const SJSU_MAP_ZOOM = 15;
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';