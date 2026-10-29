import { useState } from 'react';
import { Check, Map as MapIcon, MapPin, Search } from 'lucide-react';
import { CampusPickerMap, isNearCampus } from './CampusPickerMap';
import { IllustratedCampusPicker } from './IllustratedCampusPicker';
import type { PdfReference } from './campusIllustrationReferences';

export type Coordinates = { latitude: number; longitude: number };
type SelectionSource = 'exif' | 'manual' | 'address' | 'description' | 'device';
type AddressCandidate = { id: number; label: string; coordinates: Coordinates };

interface LocationPickerProps {
  initialCoordinates?: Coordinates;
  initialSource?: SelectionSource;
  initialAddress?: string;
  onConfirm: (coords: Coordinates, source: SelectionSource, address?: string, label?: string) => void;
  onCancel: () => void;
}

// Main Campus geographic bounds from OpenStreetMap's university way 25775883.
const CAMPUS_BOUNDS = {
  south: 37.3316140,
  north: 37.3386461,
  west: -121.8858771,
  east: -121.8765676,
};
// Include nearby streets in address search without treating them as campus buildings.
const SEARCH_BOUNDS = {
  south: CAMPUS_BOUNDS.south - 0.0015,
  north: CAMPUS_BOUNDS.north + 0.0015,
  west: CAMPUS_BOUNDS.west - 0.002,
  east: CAMPUS_BOUNDS.east + 0.002,
};
const addressCache = new Map<string, AddressCandidate[]>();
let nextGeocodingRequestAt = 0;

export function LocationPicker({ initialCoordinates, initialSource, initialAddress, onConfirm, onCancel }: LocationPickerProps) {
  const [view, setView] = useState<'illustration' | 'precise'>('illustration');
  const [selected, setSelected] = useState<Coordinates | undefined>(initialCoordinates);
  const [source, setSource] = useState<SelectionSource>(initialSource ?? 'manual');
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [selectedLabel, setSelectedLabel] = useState(initialAddress || (initialCoordinates ? 'Detected point' : ''));
  const [activeCode, setActiveCode] = useState<string>();
  const [focusPoint, setFocusPoint] = useState<Coordinates>();
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<AddressCandidate[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [searchMessage, setSearchMessage] = useState('');

  const choosePoint = (point: Coordinates) => {
    setSelected(point);
    setActiveCode(undefined);
    setSource('manual');
    setSelectedAddress(undefined);
    setSelectedLabel(isNearCampus(point) ? 'On or near SJSU Main Campus' : 'Selected map point');
    setAddressResults([]);
  };

  const chooseAddress = (candidate: AddressCandidate, reference?: PdfReference) => {
    setSelected(candidate.coordinates);
    setSource('address');
    setSelectedAddress(candidate.label);
    setSelectedLabel(reference?.name ?? candidate.label.split(',')[0]);
    setActiveCode(reference?.code);
    setFocusPoint({ ...candidate.coordinates });
    setAddressResults([]);
    setSearchState('idle');
    setSearchMessage('');
  };

  const showCandidates = (candidates: AddressCandidate[], reference?: PdfReference) => {
    if (reference && candidates.length) {
      const exact = candidates.find(candidate =>
        candidate.label.split(',')[0].toLowerCase() === reference.name.toLowerCase());
      if (exact || candidates.length === 1) {
        chooseAddress(exact ?? candidates[0], reference);
        return;
      }
    }
    setAddressResults(candidates);
    setSearchState(candidates.length ? 'idle' : 'error');
    setSearchMessage(candidates.length
      ? reference ? `Choose the map result that matches ${reference.name}.` : ''
      : 'No matching map location found nearby. Use the precise map to choose the incident point instead.');
  };

  const searchAddress = async (rawQuery = addressQuery, reference?: PdfReference) => {
    const query = rawQuery.trim();
    if (!query) {
      setSearchState('error');
      setSearchMessage('Enter a campus place or nearby address to search.');
      return;
    }
    setAddressQuery(query);
    const cacheKey = query.toLowerCase();
    const cached = addressCache.get(cacheKey);
    if (cached) {
      showCandidates(cached, reference);
      return;
    }
    setSearchState('loading');
    setSearchMessage(reference ? `Finding ${reference.name} on the geographic map…` : 'Searching nearby places…');
    try {
      // Public Nominatim usage: user-initiated only, at most one search per second.
      const slot = Math.max(Date.now(), nextGeocodingRequestAt);
      nextGeocodingRequestAt = slot + 1100;
      if (slot > Date.now()) await new Promise(resolve => window.setTimeout(resolve, slot - Date.now()));
      const params = new URLSearchParams({
        format: 'jsonv2',
        q: query,
        viewbox: `${SEARCH_BOUNDS.west},${SEARCH_BOUNDS.north},${SEARCH_BOUNDS.east},${SEARCH_BOUNDS.south}`,
        bounded: '1',
        limit: '5',
        addressdetails: '0',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Place search is temporarily unavailable. Use the precise map instead.');
      const payload = await response.json() as Array<{ place_id: number; display_name: string; lat: string; lon: string }>;
      const candidates = payload.flatMap(item => {
        const latitude = Number(item.lat);
        const longitude = Number(item.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
            latitude < SEARCH_BOUNDS.south || latitude > SEARCH_BOUNDS.north ||
            longitude < SEARCH_BOUNDS.west || longitude > SEARCH_BOUNDS.east) return [];
        return [{ id: item.place_id, label: item.display_name, coordinates: { latitude, longitude } }];
      });
      addressCache.set(cacheKey, candidates);
      showCandidates(candidates, reference);
    } catch (error) {
      setSearchState('error');
      setSearchMessage(error instanceof Error ? error.message : 'Place search failed. Use the precise map instead.');
    }
  };

  return (
    <div className="location-picker-container">
      <div className="location-picker-heading">
        <strong>Where did this happen?</strong>
        <p>Choose a building on the illustrated SJSU map, or switch to the precise map for a path, entrance, nearby street, or point already detected from your report.</p>
        <div className="location-picker-view-switch" role="group" aria-label="Choose location map">
          <button type="button" className={view === 'illustration' ? 'is-active' : ''} aria-pressed={view === 'illustration'} onClick={() => setView('illustration')}><MapIcon size={15} /> Illustrated campus</button>
          <button type="button" className={view === 'precise' ? 'is-active' : ''} aria-pressed={view === 'precise'} onClick={() => setView('precise')}><MapPin size={15} /> Precise point</button>
        </div>
      </div>
      {view === 'illustration'
        ? <IllustratedCampusPicker activeCode={activeCode} disabled={searchState === 'loading'}
            onChoose={reference => void searchAddress(reference.query, reference)} />
        : <CampusPickerMap selected={selected} label={selectedLabel} onSelect={choosePoint} focusPoint={focusPoint} />}
      <div className="location-picker-body">
        <div className="location-picker-selected" aria-live="polite">
          <MapPin size={17} aria-hidden="true" />
          <div>
            <strong>Selected location: {selected ? selectedLabel : 'None yet'}</strong>
            <span>{selected ? `${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}` : 'Choose a building or switch to the precise map to place a point.'}</span>
            {initialCoordinates && selected?.latitude === initialCoordinates.latitude && selected?.longitude === initialCoordinates.longitude &&
              <span>The detected point is preserved. Open Precise point to inspect it on a geographic map.</span>}
            {selected && !isNearCampus(selected) && <span>This point is outside the main-campus boundary. You can keep it for a nearby incident or choose a different point.</span>}
          </div>
        </div>
        <details className="location-picker-search">
          <summary>Search another campus place or nearby address</summary>
          <p>Search results come from OpenStreetMap. The PDF illustration alone does not supply report coordinates.</p>
          <label htmlFor="location-address-search">Place or street address</label>
          <div className="location-picker-search-row">
            <input id="location-address-search" type="search" value={addressQuery}
              onChange={event => setAddressQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') { event.preventDefault(); void searchAddress(); }
              }}
              placeholder="Building or nearby street" autoComplete="street-address"
              aria-describedby="address-search-disclosure" />
            <button type="button" className="secondary-button" onClick={() => void searchAddress()}
              disabled={searchState === 'loading'}><Search size={14} /> {searchState === 'loading' ? 'Searching…' : 'Search'}</button>
          </div>
          <p id="address-search-disclosure">Choosing a labelled building or searching sends its name to OpenStreetMap’s Nominatim service. Detected coordinates and precise-map taps are not sent for a place-name lookup.</p>
        </details>
        {searchMessage && <p role={searchState === 'error' ? 'alert' : 'status'} className={searchState === 'error' ? 'save-error' : 'location-picker-message'}>{searchMessage}</p>}
        {addressResults.length > 0 && (
          <div className="location-picker-results" role="group" aria-label="Place search results">
            {addressResults.map(candidate => (
              <button type="button" key={candidate.id} className="secondary-button"
                onClick={() => chooseAddress(candidate)}><MapPin size={14} /> {candidate.label}</button>
            ))}
          </div>
        )}
        <div className="location-picker-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary-button" disabled={!selected}
            onClick={() => selected && onConfirm(selected, source, selectedAddress, selectedLabel)}>
            <Check size={15} /> Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}