/**
 * Geographic reference: OpenStreetMap main-campus way 25775883 and building
 * footprints 25774796, 25774831, 25774628, 25774723, 25774762, 25774765.
 * Building labels use footprint centroids, not coordinates inferred from a PDF.
 * Source: https://api.openstreetmap.org/api/0.6/map
 * OpenStreetMap contributors, ODbL. Retrieved 2026-10-02.
 */
export const CAMPUS_BOUNDARY: [number, number][] = [
  [37.3358047, -121.8858771], [37.333161, -121.8839167],
  [37.3331436, -121.8839039], [37.3331409, -121.8838796],
  [37.3331395, -121.8838642], [37.3331381, -121.8838594],
  [37.3331349, -121.883855], [37.3330307, -121.8837767],
  [37.3330253, -121.8837727], [37.3330209, -121.8837718],
  [37.3330125, -121.8837729], [37.3329614, -121.8837871],
  [37.3329509, -121.8837879], [37.3329416, -121.8837853],
  [37.3329298, -121.8837781], [37.331614, -121.8827986],
  [37.333783, -121.8782333], [37.3338026, -121.8781912],
  [37.3338593, -121.8780732], [37.3340537, -121.8776646],
  [37.3341632, -121.8774346], [37.3345758, -121.8765676],
  [37.3386461, -121.8796206], [37.3372887, -121.8827652],
  [37.3358047, -121.8858771],
];

export const CAMPUS_LANDMARKS = [
  { name: 'MLK Library', latitude: 37.33547755, longitude: -121.88499700, labelOffset: [-60, -28] },
  { name: 'Student Union', latitude: 37.33662082, longitude: -121.88038896, labelOffset: [10, -36] },
  { name: 'Tower Hall', latitude: 37.33523181, longitude: -121.88332171, labelOffset: [-20, 36] },
  { name: 'Event Center', latitude: 37.33520417, longitude: -121.88011908, labelOffset: [110, 5] },
  // Official addresses/layout: https://www.sjsu.edu/parking/maps/garages.php
  // Georeferenced polygon centroids, OSM ways 25774762, 25774765, 1009045160.
  // Checked 2026-10-07; labels stay near the footprint instead of across the street.
  { name: 'South Parking Garage', latitude: 37.33310134, longitude: -121.88082848, labelOffset: [0, -24] },
  { name: 'West Parking Garage', latitude: 37.33237942, longitude: -121.88301061, labelOffset: [0, -24] },
  { name: 'North Parking Garage', latitude: 37.33930115, longitude: -121.88073330, labelOffset: [0, -24] },
] as const;