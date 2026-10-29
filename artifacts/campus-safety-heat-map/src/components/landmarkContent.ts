import type { ReferenceLandmark } from '../data/referenceLandmarks';

const paths = {
  parking: 'M8 20V4h5a4 4 0 0 1 0 8H8',
  building: 'M4 21V3h16v18H4M9 21v-5h6v5M8 7h1m6 0h1M8 11h1m6 0h1',
  food: 'M5 3v7m3-7v7M2 3v7h6M5 10v11M18 3v18m0-18c-5 4-5 9 0 9',
};
export function landmarkLabel(point: ReferenceLandmark): HTMLElement {
  const text = document.createElement('span');
  text.className = `campus-landmark-label reference-landmark${point.name === 'SJSU Campus' ? ' campus-area-label' : ''}`;
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(icon.namespaceURI, 'path');
  path.setAttribute('d', paths[point.kind]);
  icon.append(path);
  text.append(icon, document.createTextNode(point.name));
  return text;
}
export function landmarkPopup(point: ReferenceLandmark): HTMLElement {
  const card = document.createElement('section');
  card.className = 'landmark-info';
  const title = document.createElement('strong');
  title.textContent = point.name;
  card.append(title);
  if (point.details) {
    const detail = document.createElement('p');
    detail.textContent = point.details;
    card.append(detail);
  }
  return card;
}
