import L from 'leaflet';
import { ACTIVITY_LEGEND } from '../data/publicMapPresentation';

export function addPublicMapLegend(map: L.Map): L.Control {
  const legend = new L.Control({ position: 'bottomleft' });
  legend.onAdd = () => {
    const details = L.DomUtil.create('details', 'public-map-legend');
    details.open = false;
    details.setAttribute('aria-label', 'Map legend');
    const summary = document.createElement('summary');
    summary.textContent = 'LEGEND';
    details.append(summary);
    const body = document.createElement('div');
    body.className = 'public-map-legend-body';
    const range = document.createElement('span');
    range.textContent = 'Fewer reports     More reports';
    range.style.whiteSpace = 'pre';
    const gradient = document.createElement('span');
    gradient.className = 'activity-volume-gradient';
    gradient.setAttribute('aria-label', 'Cream to gold to burnt orange to royal red: increasing report concentration');
    body.append(range, gradient);
    for (const line of ACTIVITY_LEGEND) {
      const item = document.createElement('span');
      item.textContent = line;
      body.append(item);
    }
    details.append(body);
    L.DomEvent.disableClickPropagation(details);
    L.DomEvent.disableScrollPropagation(details);
    details.addEventListener('toggle', () => map.fire('moveend'));
    return details;
  };
  legend.addTo(map);
  return legend;
}