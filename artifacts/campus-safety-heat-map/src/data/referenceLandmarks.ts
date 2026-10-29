import { CAMPUS_LANDMARKS } from './campusLandmarks';
import { CAMPUS_AREA_LABEL, DOWNTOWN_LANDMARKS } from './publicMapGeography';

export type ReferenceLandmark = {
  name: string; latitude: number; longitude: number; labelOffset: readonly number[];
  kind: 'parking' | 'building' | 'food'; details?: string; minZoom?: number;
};
// OSM footprint centers, retrieved 2026-10-07. Garage details verified against:
// https://www.sjsu.edu/parking/maps/garages.php (2026-10-07).
// Names and full addresses also checked against https://sjsuparkingstatus.sjsu.edu/.
// Engineering relation 22601, Spartan Complex relation 7974256, South Campus way 956530357.
// Other new buildings: ways 25774691, 25774740, 467837309, 411545037.
const permitHours = '24/7: E, R, H, Carpool & Overnight permits. Other permits: 7 a.m.–midnight.';
const garageDetails: Record<string, { name: string; details: string }> = {
  'South Parking Garage': { name: 'South Garage', details: `377 S. 7th St., San Jose, CA 95112 · 5 levels · 1,445 general spaces. ${permitHours}` },
  'West Parking Garage': { name: 'West Garage', details: `350 S. 4th St., San Jose, CA 95112 · 5 levels · 1,135 general spaces. ${permitHours}` },
  'North Parking Garage': { name: 'North Garage', details: `65 S. 10th St., San Jose, CA 95112 · 6 levels · 1,445 general spaces. ${permitHours}` },
};
export const REFERENCE_LANDMARKS: ReferenceLandmark[] = [
  { ...CAMPUS_AREA_LABEL, kind: 'building' },
  ...CAMPUS_LANDMARKS.map(point => ({
    ...point, ...(garageDetails[point.name] ?? {}),
    kind: garageDetails[point.name] ? 'parking' as const : 'building' as const,
    minZoom: garageDetails[point.name] ? 15.5 : undefined,
  })),
  ...DOWNTOWN_LANDMARKS.map(point => ({
    ...point, kind: ['San Pedro Square', 'SoFA District'].includes(point.name) ? 'food' as const : 'building' as const,
    ...(['San Pedro Square', 'SoFA District'].includes(point.name) ? { details: 'Downtown food and dining area.', minZoom: 15 } : {}),
  })),
  { name: 'South Campus Garage', latitude: 37.32078367, longitude: -121.86535697, labelOffset: [0, -24], kind: 'parking', minZoom: 15,
    details: '1278 S. 10th Street, San Jose, CA 95112 · S 10th & Alma · 4 levels · 1,480 general spaces. Open daily, 7 a.m.–10 p.m.' },
  { name: 'Engineering', latitude: 37.33682548, longitude: -121.8814139, labelOffset: [0, -24], kind: 'building', details: 'Engineering Building.' },
  { name: 'Business', latitude: 37.33668688, longitude: -121.87870643, labelOffset: [0, -24], kind: 'building', details: 'Boccardo Business Center.' },
  { name: 'Campus Village', latitude: 37.33536837, longitude: -121.87806635, labelOffset: [0, -24], kind: 'building', details: 'Campus Village residential area.' },
  { name: 'Science', latitude: 37.33468566, longitude: -121.88451289, labelOffset: [0, -24], kind: 'building', details: 'Science Building.' },
  { name: 'Spartan Complex', latitude: 37.33426549, longitude: -121.88233908, labelOffset: [0, -24], kind: 'building' },
  { name: 'Student Wellness', latitude: 37.33480622, longitude: -121.8812565, labelOffset: [0, -24], kind: 'building', details: 'Student Wellness Center.' },
  // Existing downtown area anchor; represents a corridor, not an individual restaurant.
  { name: 'Paseo Dining', latitude: 37.33293, longitude: -121.88982, labelOffset: [0, -24], kind: 'food', minZoom: 15.5,
    details: 'Paseo de San Antonio dining corridor near SJSU.' },
];
