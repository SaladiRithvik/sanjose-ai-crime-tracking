import type L from 'leaflet';
import type { StyleSpecification } from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

const ESRI_VECTOR = 'https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer';
const GRAY_STYLE = 'https://www.arcgis.com/sharing/rest/content/items/291da5eab3a0412593b66d384379f89f/resources/styles/root.json';

/**
 * Raster World_Light_Gray_Base includes baked-in street/park names. Use its
 * public Esri vector equivalent, removing symbol layers before rendering.
 * Keep the existing, faded raster available if WebGL or tile requests fail.
 */
export function startPublicBasemap(map: L.Map, fallback: L.TileLayer, container: HTMLElement): () => void {
  const controller = new AbortController();
  let disposed = false;
  let vector: L.MaplibreGL | undefined;
  let timeout: ReturnType<typeof setTimeout>;
  const fail = () => {
    if (disposed) return;
    clearTimeout(timeout);
    controller.abort();
    if (vector && map.hasLayer(vector)) map.removeLayer(vector);
    fallback.setOpacity(0.28);
    container.dataset.basemap = 'faded-raster-fallback';
  };
  timeout = setTimeout(fail, 15_000);
  void (async () => {
    try {
      const [response, plugin] = await Promise.all([
        fetch(GRAY_STYLE, { signal: controller.signal }),
        import('@maplibre/maplibre-gl-leaflet'),
      ]);
      if (!response.ok) throw new Error('Esri light-gray style unavailable');
      const style = await response.json() as StyleSpecification;
      style.layers = style.layers.filter(layer => layer.type !== 'symbol');
      style.sources = {
        esri: {
          type: 'vector', tiles: [`${ESRI_VECTOR}/tile/{z}/{y}/{x}.pbf`],
          minzoom: 0, maxzoom: 22,
          attribution: 'Tiles © Esri, HERE, Garmin, GIS user community',
        },
      };
      delete style.glyphs;
      if (disposed || controller.signal.aborted) return;
      setWorkerUrl(workerUrl);
      vector = plugin.maplibreGL({ style, interactive: false, attributionControl: false });
      const layer = vector;
      const remove = layer.onRemove.bind(layer);
      layer.onRemove = currentMap => {
        // WebGL construction can fail after Leaflet registers the layer.
        if (layer.getMaplibreMap()) remove(currentMap);
        else layer.getContainer()?.remove();
        return layer;
      };
      vector.addTo(map);
      const gl = vector.getMaplibreMap();
      gl.on('error', fail);
      gl.once('load', () => {
        if (disposed || controller.signal.aborted) return;
        clearTimeout(timeout);
        fallback.setOpacity(0);
        container.dataset.basemap = 'esri-label-free-vector';
      });
    } catch (error) {
      console.warn('Label-free basemap unavailable; using faded raster.', error instanceof Error ? error.message : String(error));
      fail();
    }
  })();
  return () => {
    disposed = true;
    controller.abort();
    clearTimeout(timeout);
  };
}