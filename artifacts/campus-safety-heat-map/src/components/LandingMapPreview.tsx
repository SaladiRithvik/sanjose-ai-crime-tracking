import { useMemo, useState } from 'react';
import GeographicHeatMap from './GeographicHeatMap';
import { useAppContext } from '../context/AppContext';
import { ACTIVITY_DISCLAIMER, isMapEligible } from '../data/publicMapPresentation';

export function LandingMapPreview() {
  const { reports, storageState, storageError, reloadReports } = useAppContext();
  const [selectedId, setSelectedId] = useState('');
  const approved = useMemo(() => storageState === 'error' ? [] : reports.filter(isMapEligible), [reports, storageState]);
  return (
    <div className="lp-map public-heat-map public-map-page">
      <div className="lp-map-frame">
        <GeographicHeatMap reports={approved} selectedId={selectedId} onSelect={setSelectedId} isAuthenticated={false} revealSelected={false} publicView={true} />
        {storageState === 'loading' && <div className="lp-map-state" role="status">Loading approved community reports...</div>}
        {storageState === 'error' && (
          <div className="lp-map-state" role="alert">
            <span>Reports could not be loaded{storageError ? `: ${storageError}` : '.'}</span>
            <button type="button" className="lp-link" onClick={() => void reloadReports()}>Try again</button>
          </div>
        )}
        {storageState === 'ready' && approved.length === 0 && <div className="lp-map-state" role="status">No approved reports yet.</div>}
      </div>
      <div className="map-foot"><span>{ACTIVITY_DISCLAIMER}</span></div>
    </div>
  );
}
