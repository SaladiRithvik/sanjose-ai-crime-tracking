import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from './LocationPicker';

// OpenStreetMap / Nominatim: San José State University Main Campus (way 25775883).
// These are map viewport bounds, not an alignment of the campus-map PDF.
const CAMPUS_BOUNDS: [[number, number], [number, number]] = [
  [37.3316140, -121.8858771],
  [37.3386461, -121.8765676],
];

export function isNearCampus(point: Coordinates) {
  return L.latLngBounds(CAMPUS_BOUNDS).contains([point.latitude, point.longitude]);
}

type Props = {
  selected?: Coordinates;
  label?: string;
  onSelect: (point: Coordinates) => void;
  focusPoint?: Coordinates;
};

export function CampusPickerMap({ selected, label, onSelect, focusPoint }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      touchZoom: true,
      dragging: true,
      tapHold: false,
    });
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    if (selected) {
      map.setView([selected.latitude, selected.longitude], isNearCampus(selected) ? 17 : 16);
    } else {
      map.fitBounds(CAMPUS_BOUNDS, { padding: [12, 12], maxZoom: 16 });
    }
    map.on('click', event => onSelectRef.current({
      latitude: event.latlng.lat,
      longitude: event.latlng.lng,
    }));
    // The picker starts inside a conditional panel and may need a size update after layout.
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selected) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const point: L.LatLngTuple = [selected.latitude, selected.longitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(point, {
        draggable: true,
        keyboard: true,
        title: 'Selected incident point — drag to correct',
        icon: L.divIcon({
          className: 'campus-picker-pin',
          html: '<span aria-hidden="true"></span>',
          iconSize: [28, 36],
          iconAnchor: [14, 34],
        }),
      }).addTo(map);
      markerRef.current.on('dragend', () => {
        const position = markerRef.current?.getLatLng();
        if (position) onSelectRef.current({ latitude: position.lat, longitude: position.lng });
      });
    } else {
      markerRef.current.setLatLng(point);
    }
    markerRef.current.unbindTooltip();
    if (label) markerRef.current.bindTooltip(label, { direction: 'top', offset: [0, -28] });
  }, [selected?.latitude, selected?.longitude, label]);

  useEffect(() => {
    if (focusPoint) mapRef.current?.flyTo([focusPoint.latitude, focusPoint.longitude], 18);
  }, [focusPoint]);

  return (
    <div className="campus-picker-map-wrap">
      <div ref={containerRef} className="campus-picker-map" role="application"
        aria-label="SJSU incident location map. Tap to place a marker, then drag it to adjust. Zoom with the plus and minus controls." />
      <button type="button" className="campus-picker-reset" onClick={() => mapRef.current?.fitBounds(CAMPUS_BOUNDS, { padding: [12, 12], maxZoom: 16 })}>
        Show full campus
      </button>
    </div>
  );
}