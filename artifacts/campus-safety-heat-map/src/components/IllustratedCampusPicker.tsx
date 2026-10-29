import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { PDF_REFERENCES, type PdfReference } from './campusIllustrationReferences';

type Props = {
  activeCode?: string;
  disabled: boolean;
  onChoose: (reference: PdfReference) => void;
};

export function IllustratedCampusPicker({ activeCode, disabled, onChoose }: Props) {
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const changeZoom = (next: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight;
    setZoom(next);
    requestAnimationFrame(() => {
      const updated = viewportRef.current;
      if (!updated) return;
      updated.scrollLeft = centerX * updated.scrollWidth - updated.clientWidth / 2;
      updated.scrollTop = centerY * updated.scrollHeight - updated.clientHeight / 2;
    });
  };

  return (
    <div className="illustrated-picker">
      <div className="illustrated-picker-top">
        <div>
          <strong>Illustrated main-campus map</strong>
          <span>Choose a labelled building below or on the map. Zoom and drag, scroll or swipe to read it.</span>
        </div>
        <div className="illustrated-zoom" aria-label="Illustration zoom controls">
          <button type="button" onClick={() => changeZoom(Math.max(1, zoom - 0.6))} disabled={zoom <= 1} aria-label="Zoom illustration out"><Minus size={15} /></button>
          <button type="button" onClick={() => changeZoom(Math.min(2.8, zoom + 0.6))} disabled={zoom >= 2.8} aria-label="Zoom illustration in"><Plus size={15} /></button>
        </div>
      </div>
      <div ref={viewportRef} className="illustrated-viewport" aria-label="Scrollable illustrated SJSU campus map"
        onPointerDown={event => {
          if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as Element).closest('button')) return;
          const viewport = viewportRef.current;
          if (!viewport) return;
          pointerRef.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
          viewport.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const start = pointerRef.current;
          const viewport = viewportRef.current;
          if (!start || !viewport) return;
          viewport.scrollLeft = start.left + start.x - event.clientX;
          viewport.scrollTop = start.top + start.y - event.clientY;
        }}
        onPointerUp={() => { pointerRef.current = null; }}
        onPointerCancel={() => { pointerRef.current = null; }}>
        <div className="illustrated-canvas" style={{ width: `${zoom * 100}%` }}>
          <img src={`${import.meta.env.BASE_URL}sjsu-illustrated-campus.png`} alt="Official SJSU campus illustration with building codes, nearby streets and paths. Use the labelled buttons below to choose a building." draggable={false} />
          {PDF_REFERENCES.map(reference => (
            <button type="button" key={reference.code}
              style={{ left: `${reference.x}%`, top: `${reference.y}%` }}
              className={`illustrated-hotspot${activeCode === reference.code ? ' is-selected' : ''}`}
              aria-label={`Select ${reference.name} on illustrated campus map`}
              title={`${reference.code} · ${reference.name}`}
              aria-pressed={activeCode === reference.code}
              disabled={disabled}
              onClick={() => onChoose(reference)}>{reference.code}</button>
          ))}
        </div>
      </div>
      <div className="illustrated-building-list" aria-label="Select a campus building">
        {PDF_REFERENCES.map(reference => (
          <button type="button" key={reference.code}
            className={activeCode === reference.code ? 'is-selected' : ''}
            aria-pressed={activeCode === reference.code}
            onClick={() => onChoose(reference)}
            disabled={disabled}>
            <span>{reference.code}</span>{reference.name}
          </button>
        ))}
      </div>
      <p className="illustrated-disclosure">Illustration: supplied SJSU Main Campus Map. Building codes follow its location key. The drawing is not GPS-aligned; a place must be found on OpenStreetMap before it can be confirmed as a report location.</p>
    </div>
  );
}