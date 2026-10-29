import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ReportRecord, Coordinates } from '../data/reports';
import { OSM_ATTRIBUTION } from '../data/mapGeography';
import { collectiveDensityAt, displayHeatDensity, heatColorAt } from '../data/collectiveHeat';
import { CAMPUS_BOUNDARY } from '../data/campusLandmarks';
import { clusterDiameter, clusterReports, separateNearbyReports } from '../data/mapClusters';
import { heatLayerTransform } from '../data/heatLayerTransform';
import { incidentSeverity, PUBLIC_MAP_SEVERITY_COLORS as SEVERITY_COLORS, type Severity } from '../data/incidentPresentation';
import { PUBLIC_MAP_BOUNDS, insideCampus } from '../data/publicMapGeography';
import { OVERVIEW_LABELS, publicMapSeverity, publicHeatColorAt, publicHeatOpacity, activityMarkerColor } from '../data/publicMapPresentation';
import { addPublicMapLegend } from './publicMapLegend';
import { reportActivityPopup } from './reportActivityPopup';
import { REFERENCE_LANDMARKS } from '../data/referenceLandmarks';
import { landmarkLabel, landmarkPopup } from './landmarkContent';
import '../pages/public-map-renderer.css';

type Props = {
  reports: ReportRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
  isAuthenticated: boolean;
  revealSelected?: boolean;
  severityColors?: Record<Severity, string>;
  publicView?: boolean;
};

type ScreenBox = { left: number; top: number; right: number; bottom: number };
const intersects = (a: ScreenBox, b: ScreenBox) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
// An area name can move within the campus polygon, unlike a building label.
const campusLabelOffsets = Array.from({ length: 19 * 19 }, (_, i) =>
  [(i % 19 - 9) * 12, (Math.floor(i / 19) - 9) * 12],
).sort((a, b) => a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2);

/**
 * Samples geographic density on a small offscreen raster, then smooth-scales it
 * into Leaflet's overlay pane. Pointer events pass through to the basemap.
 */
function paintHeat(map: L.Map, canvas: HTMLCanvasElement, coordinates: Coordinates[], publicView: boolean) {
  const size = map.getSize();
  if (!size.x || !size.y) return;
  const step = 4;
  const width = Math.ceil(size.x / step);
  const height = Math.ceil(size.y / step);
  const raster = document.createElement('canvas');
  raster.width = width;
  raster.height = height;
  const context = raster.getContext('2d');
  const output = canvas.getContext('2d');
  if (!context || !output) return;
  const pixels = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const point = map.containerPointToLatLng(L.point((x + 0.5) * size.x / width, (y + 0.5) * size.y / height));
      const density = collectiveDensityAt(
        { latitude: point.lat, longitude: point.lng },
        coordinates,
        publicView ? 90 : undefined,
      );
      const [red, green, blue, alpha] = publicView
        ? publicHeatColorAt(density) : heatColorAt(displayHeatDensity(density));
      const index = (y * width + x) * 4;
      pixels.data[index] = red;
      pixels.data[index + 1] = green;
      pixels.data[index + 2] = blue;
      pixels.data[index + 3] = alpha;
    }
  }
  context.putImageData(pixels, 0, 0);
  canvas.width = size.x;
  canvas.height = size.y;
  canvas.style.width = `${size.x}px`;
  canvas.style.height = `${size.y}px`;
  L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
  output.imageSmoothingEnabled = true;
  output.drawImage(raster, 0, 0, size.x, size.y);
}

function renderMarkers(map: L.Map, layer: L.LayerGroup, reports: ReportRecord[], selectedId: string,
  onSelect: (id: string) => void, colors: Record<Severity, string>, publicView: boolean): ScreenBox[] {
  layer.clearLayers();
  const occupied: ScreenBox[] = [];
  const positions = reports.map(report => {
    const point = map.latLngToContainerPoint([report.coordinates.latitude, report.coordinates.longitude]);
    return { report, x: point.x, y: point.y };
  });
  // Group crowded overview markers; separate close-up points without altering stored locations.
  const clusters = map.getZoom() >= 18
    ? separateNearbyReports(positions)
    : clusterReports(positions, publicView ? 40 : 42);
  const rank: Record<Severity, number> = { Low: 0, Medium: 1, High: 2 };
  for (const cluster of clusters) {
    const records = cluster.items.map(item => item.report);
    const item = records[0];
    const isCluster = records.length > 1;
    const selected = records.some(report => report.id === selectedId);
    const severity = records.reduce<Severity>((highest, report) => {
      const level = publicView ? publicMapSeverity(report) : incidentSeverity(report.incidentType);
      return rank[level] > rank[highest] ? level : highest;
    }, 'Low');
    const size = publicView || isCluster ? clusterDiameter(records.length) : 36;
    const radius = (publicView || isCluster ? size / 2 : selected ? 15 : 10) + (publicView && selected ? 9 : 5);
    occupied.push({ left: cluster.x - radius, right: cluster.x + radius, top: cluster.y - radius, bottom: cluster.y + radius });
    const location = map.containerPointToLatLng([cluster.x, cluster.y]);
    const counts = { High: 0, Medium: 0, Low: 0 };
    records.forEach(report => { counts[publicView ? publicMapSeverity(report) : incidentSeverity(report.incidentType)]++; });
    const levels = (['Low', 'Medium', 'High'] as const).filter(level => counts[level] > 0);
    const label = publicView ? `${records.length} approved report${records.length === 1 ? '' : 's'}. ${isCluster ? 'Zoom in to separate reports.' : 'Open report details.'}` : isCluster
      ? `${records.length} reports · ${levels.map(level => `${counts[level]} ${level}`).join(' · ')}`
      : `${item.incidentType}, ${severity}`;
    const marker = L.marker(location, {
      icon: L.divIcon({
        className: `${publicView || isCluster ? 'incident-cluster-icon' : 'incident-marker-icon'} ${publicView ? 'report-activity-marker' : `severity-${severity.toLowerCase()}`}${selected ? ' selected' : ''}`,
        html: publicView || isCluster ? `<span class="incident-cluster-symbol">${records.length}</span>` : '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
      keyboard: false,
      riseOnHover: true,
      zIndexOffset: selected ? 1000 : 0,
    });
    const zoomToReports = () => {
      map.closePopup();
      const bounds = L.latLngBounds(records.map(report =>
        L.latLng(report.coordinates.latitude, report.coordinates.longitude),
      ));
      // Always progress, even when fitBounds alone would choose the current zoom.
      // At zoom 18 renderMarkers separates all overlapping reports.
      const zoom = Math.min(18, Math.max(map.getZoom() + 1, map.getBoundsZoom(bounds, false, L.point(110, 110))));
      map.setView(bounds.getCenter(), zoom);
    };
    const activate = () => {
      if (isCluster) { zoomToReports(); return; }
      if (publicView) {
        const popupWidth = Math.max(160, Math.min(240, map.getSize().x - 76));
        const popup = L.popup({
          className: 'activity-map-popup', minWidth: popupWidth, maxWidth: popupWidth,
          autoPan: true, keepInView: true,
          autoPanPaddingTopLeft: L.point(12, 80), autoPanPaddingBottomRight: L.point(12, 44),
        })
          .setLatLng(location)
          .setContent(reportActivityPopup(item))
          .openOn(map);
        popup.getElement()?.querySelector<HTMLElement>('.leaflet-popup-close-button')?.focus({ preventScroll: true });
        onSelect(item.id);
        return;
      }
      onSelect(item.id);
    };
    const tooltip = document.createElement('div');
    tooltip.className = 'incident-tooltip-card';
    if (publicView) {
      tooltip.textContent = `${records.length} approved report${records.length === 1 ? '' : 's'} · ${isCluster ? 'Click to zoom in' : 'Select for details'}`;
    } else if (isCluster) {
      const count = document.createElement('strong');
      count.textContent = `${records.length} reports`;
      tooltip.append(count);
      for (const level of levels) {
        const part = document.createElement('span');
        part.className = 'tooltip-severity-count';
        part.setAttribute('aria-label', `${counts[level]} ${level}`);
        const dot = document.createElement('i');
        dot.className = 'tooltip-severity-dot';
        dot.style.backgroundColor = colors[level];
        dot.setAttribute('aria-hidden', 'true');
        const number = document.createElement('span');
        number.textContent = String(counts[level]);
        part.append(dot, number);
        tooltip.append(part);
      }
    }
    else {
      const heading = document.createElement('div');
      const type = document.createElement('strong');
      type.textContent = item.incidentType;
      const badge = document.createElement('span');
      badge.className = 'report-badge severity';
      badge.style.setProperty('--severity-color', colors[severity]);
      badge.textContent = severity.toUpperCase();
      heading.append(type, badge);
      tooltip.append(heading);
    }
    marker.bindTooltip(tooltip, { className: 'incident-hover', direction: 'top', opacity: 1, offset: [0, isCluster ? -size / 2 : -14] });
    marker.on('click', activate);
    marker.addTo(layer);
    const element = marker.getElement();
    if (element) {
      element.style.setProperty('--severity-color', publicView ? activityMarkerColor(records.length) : colors[severity]);
      element.style.setProperty('--activity-text', records.length < 6 ? '#38260e' : '#ffffff');
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.setAttribute('aria-label', label);
      element.setAttribute('data-testid', isCluster ? `button-map-cluster-${item.id}` : `button-map-marker-${item.id}`);
      element.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    }
  }
  return occupied;
}

export default function GeographicHeatMap({ reports, selectedId, onSelect, isAuthenticated, revealSelected = true, severityColors = SEVERITY_COLORS, publicView = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const redrawRef = useRef<(() => void) | null>(null);
  const reportsRef = useRef(reports);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selectedId);
  const colorsRef = useRef(severityColors);
  const initialSelectionRef = useRef(true);
  reportsRef.current = reports;
  onSelectRef.current = onSelect;
  selectedRef.current = selectedId;
  colorsRef.current = severityColors;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, zoomSnap: 0.25 })
      .fitBounds(L.latLngBounds(PUBLIC_MAP_BOUNDS), { padding: [32, 32], maxZoom: 16 });
    mapRef.current = map;
    const raster = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: `${OSM_ATTRIBUTION} | Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, GIS user community`,
      // This region has real imagery through z16; higher advertised levels return no-data tiles.
      maxNativeZoom: 16,
      maxZoom: 19,
      opacity: publicView ? 0.28 : 1,
    }).addTo(map);
    let stopBasemap: (() => void) | undefined;
    let disposed = false;
    if (publicView) {
      void import('./publicBasemap').then(({ startPublicBasemap }) => {
        if (!disposed && containerRef.current) stopBasemap = startPublicBasemap(map, raster, containerRef.current);
      });
      addPublicMapLegend(map);
    }
    const jumps = new L.Control({ position: 'topright' });
    jumps.onAdd = () => {
      const controls = L.DomUtil.create('div', 'map-quick-jumps');
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Map view controls');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Center';
      button.title = 'Center on all reports matching the current filters';
      button.setAttribute('data-testid', 'button-map-center');
      button.onclick = () => {
        map.closePopup();
        // Read the latest filtered reports, including those outside the viewport.
        const points: [number, number][] = reportsRef.current.map(report =>
          [report.coordinates.latitude, report.coordinates.longitude],
        );
        map.fitBounds(L.latLngBounds(points.length ? points : PUBLIC_MAP_BOUNDS), {
          padding: [48, 48], maxZoom: points.length ? 17 : 16,
        });
      };
      controls.append(button);
      L.DomEvent.disableClickPropagation(controls);
      L.DomEvent.disableScrollPropagation(controls);
      return controls;
    };
    jumps.addTo(map);
    map.createPane('campusBoundary').style.zIndex = '420';
    map.createPane('campusReference').style.zIndex = '450';
    L.polygon(CAMPUS_BOUNDARY, {
      pane: 'campusBoundary', className: 'campus-boundary', color: '#284a70',
      weight: publicView ? 0.75 : 1.25, opacity: publicView ? 0.5 : 1,
      fillColor: '#c9d8ea', fillOpacity: publicView ? 0.035 : 0.1,
      interactive: false,
    }).addTo(map);
    const landmarks = L.layerGroup().addTo(map);
    L.control.layers(undefined, { Landmarks: landmarks }, { collapsed: false, position: 'bottomright' }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    const canvas = document.createElement('canvas');
    canvas.className = 'collective-heat-canvas leaflet-zoom-animated';
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.setAttribute('aria-hidden', 'true');
    const pane = map.getPanes().overlayPane;
    pane.insertBefore(canvas, pane.firstChild);
    canvasRef.current = canvas;
    let zooming = false;
    let paintedAnchor: { northWest: L.LatLng; zoom: number } | null = null;
    const syncHeat = (event?: L.ZoomAnimEvent) => {
      if (!paintedAnchor) return;
      const zoom = event?.zoom ?? map.getZoom();
      const center = event?.center ?? map.getCenter();
      const transform = heatLayerTransform(
        map.project(paintedAnchor.northWest, zoom),
        map.project(center, zoom),
        map.getSize(),
        map.containerPointToLayerPoint([0, 0]),
        map.getZoomScale(zoom, paintedAnchor.zoom),
      );
      L.DomUtil.setTransform(canvas, L.point(transform.x, transform.y), transform.scale);
    };
    const syncHeatView = () => syncHeat();
    const redraw = () => {
      // Keep the existing geographically anchored raster during animation.
      // Repainting with an intermediate viewport would invalidate its anchor.
      if (zooming) return;
      paintHeat(map, canvas, reportsRef.current.map(item => item.coordinates), publicView);
      canvas.style.opacity = publicView ? String(publicHeatOpacity(map.getZoom())) : '1';
      paintedAnchor = { northWest: map.containerPointToLatLng([0, 0]), zoom: map.getZoom() };
      syncHeatView();
      const occupied = markersRef.current ? renderMarkers(map, markersRef.current, reportsRef.current,
        selectedRef.current, id => onSelectRef.current(id), colorsRef.current, publicView) : [];
      landmarks.clearLayers();
      // overlayremove fires before LayerGroup clears its map reference.
      // Do not re-add children during that event or they become orphaned on the map.
      if (!map.hasLayer(landmarks)) {
        map.eachLayer(layer => {
          if (layer instanceof L.Popup && layer.options.className?.includes('landmark-popup')) map.closePopup(layer);
        });
        return;
      }
      const containerBounds = map.getContainer().getBoundingClientRect();
      map.getContainer().querySelectorAll('.leaflet-control').forEach(control => {
        const box = control.getBoundingClientRect();
        occupied.push({ left: box.left - containerBounds.left - 5, right: box.right - containerBounds.left + 5,
          top: box.top - containerBounds.top - 5, bottom: box.bottom - containerBounds.top + 5 });
      });
      // Reserve label space for garages before secondary campus/downtown references.
      // Report markers and controls remain the highest collision priority.
      const orderedLandmarks = [...REFERENCE_LANDMARKS].sort((a, b) =>
        Number(b.kind === 'parking') - Number(a.kind === 'parking'));
      for (const landmark of orderedLandmarks) {
        if (publicView && map.getZoom() < (landmark.minZoom ?? 16.5) && !OVERVIEW_LABELS.has(landmark.name)) continue;
        const origin = L.latLng(landmark.latitude, landmark.longitude);
        if (!map.getBounds().contains(origin)) continue;
        const text = landmarkLabel(landmark);
        // Measure the actual label, including font metrics, instead of guessing its width.
        const labelMarker = L.marker(origin, {
          pane: 'campusReference', interactive: true, keyboard: true, title: landmark.name,
          icon: L.divIcon({ className: 'campus-landmark-icon', html: text.outerHTML, iconSize: [0, 0], iconAnchor: [0, 0] }),
        }).addTo(landmarks);
        labelMarker.on('click', () => {
          const width = Math.min(230, map.getSize().x - 80);
          L.popup({ className: 'activity-map-popup landmark-popup', minWidth: width, maxWidth: width, keepInView: true,
            autoPanPaddingTopLeft: L.point(12, 80), autoPanPaddingBottomRight: L.point(12, 60) })
            .setLatLng(origin).setContent(landmarkPopup(landmark)).openOn(map);
        });
        const element = labelMarker.getElement();
        if (!element) continue;
        element.style.visibility = 'hidden';
        const span = element.querySelector<HTMLElement>('.campus-landmark-label');
        if (!span) { landmarks.removeLayer(labelMarker); continue; }
        const bounds = span.getBoundingClientRect();
        const halfWidth = bounds.width / 2, halfHeight = bounds.height / 2;
        const pixel = map.latLngToContainerPoint(origin);
        const offsets = [
          landmark.labelOffset, [0, 0], [0, -22], [0, 22],
          [halfWidth + 20, 0], [-halfWidth - 20, 0],
          [halfWidth + 16, -22], [-halfWidth - 16, 22],
          // Garage activity clusters need more clearance than a single report.
          ...(landmark.kind === 'parking' ? [
            [0, -44], [0, 44], [halfWidth + 38, 0], [-halfWidth - 38, 0],
            [halfWidth + 38, -44], [-halfWidth - 38, 44],
          ] : []),
           ...(landmark.name === 'SJSU Campus' || publicView && OVERVIEW_LABELS.has(landmark.name) ? campusLabelOffsets : []),
        ];
        let placed = false;
        for (const [dx, dy] of offsets) {
          const target = L.point(pixel.x + dx, pixel.y + dy);
          const box = { left: target.x - halfWidth - 4, right: target.x + halfWidth + 4,
            top: target.y - halfHeight - 3, bottom: target.y + halfHeight + 3 };
          if (box.left < 8 || box.top < 8 || box.right > map.getSize().x - 8 || box.bottom > map.getSize().y - 8
            || occupied.some(other => intersects(box, other))) continue;
          if (landmark.name === 'SJSU Campus') {
            const corners = [[box.left, box.top], [box.right, box.top], [box.left, box.bottom], [box.right, box.bottom]];
            if (!corners.every(corner => {
              const point = map.containerPointToLatLng(L.point(corner[0], corner[1]));
              return insideCampus(point.lat, point.lng, CAMPUS_BOUNDARY);
            })) continue;
          }
          labelMarker.setLatLng(map.containerPointToLatLng(target));
          if (landmark.kind === 'parking' && Math.hypot(dx, dy) > 30) {
            L.polyline([origin, map.containerPointToLatLng(target)], {
              pane: 'campusReference', color: '#66758a', weight: 1, opacity: 0.65,
              interactive: false,
            }).addTo(landmarks);
          }
          occupied.push(box);
          element.style.visibility = 'visible';
          placed = true; break;
        }
        if (!placed) landmarks.removeLayer(labelMarker);
      }
    };
    redrawRef.current = redraw;
    void document.fonts?.ready.then(() => { if (mapRef.current === map) redrawRef.current?.(); });
    const hideLandmarks = () => { zooming = true; landmarks.clearLayers(); };
    const finishZoom = () => { zooming = false; redraw(); };
    map.on('zoomanim', syncHeat);
    map.on('zoom viewreset', syncHeatView);
    map.on('zoomstart', hideLandmarks);
    map.on('zoomend', finishZoom);
    map.on('moveend resize', redraw);
    map.on('overlayadd overlayremove', redraw);
    redraw();
    // Leaflet needs a size check after the grid has settled.
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      disposed = true;
      stopBasemap?.();
      cancelAnimationFrame(frame);
      map.off('zoomanim', syncHeat);
      map.off('zoom viewreset', syncHeatView);
      map.off('moveend resize', redraw);
      map.off('overlayadd overlayremove', redraw);
      map.off('zoomend', finishZoom);
      map.off('zoomstart', hideLandmarks);
      redrawRef.current = null;
      map.remove();
      canvas.remove();
      canvasRef.current = null;
      markersRef.current = null;
      mapRef.current = null;
    };
  }, [publicView]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    const visibleIds = new Set(reports.map(report => report.id));
    map.eachLayer(currentLayer => {
      if (!(currentLayer instanceof L.Popup)) return;
      const content = currentLayer.getContent();
      if (content instanceof HTMLElement && content.dataset.reportIds) {
        const ids = JSON.parse(content.dataset.reportIds) as string[];
        if (ids.some(id => !visibleIds.has(id))) map.closePopup(currentLayer);
      }
    });
    redrawRef.current?.();
  }, [reports, selectedId, isAuthenticated, severityColors]);

  useEffect(() => {
    // Preserve the overview on entry, and don't undo quick jumps on every poll.
    if (initialSelectionRef.current) { initialSelectionRef.current = false; return; }
    if (!revealSelected) return;
    const selected = reportsRef.current.find(item => item.id === selectedId);
    const map = mapRef.current;
    if (selected && map && !map.getBounds().contains([selected.coordinates.latitude, selected.coordinates.longitude])) {
      map.panTo([selected.coordinates.latitude, selected.coordinates.longitude]);
    }
  }, [selectedId, revealSelected]);

  return <div ref={containerRef} className="map-geography" role="region" aria-label="Interactive geographic map of user-reported incidents in San José. Pan and zoom to explore." data-testid="geographic-heat-map" />;
}