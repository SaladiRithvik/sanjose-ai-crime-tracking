type Point = { x: number; y: number };

/**
 * Project a painted geographic anchor into Leaflet's target layer coordinates.
 * containerOrigin is containerPointToLayerPoint([0, 0]), i.e. the inverse
 * map-pane translation. Include it when zooming around an off-center cursor.
 */
export function heatLayerTransform(
  anchorWorld: Point,
  centerWorld: Point,
  viewport: Point,
  containerOrigin: Point,
  scale: number,
): Point & { scale: number } {
  return {
    x: anchorWorld.x - Math.round(centerWorld.x - viewport.x / 2 - containerOrigin.x),
    y: anchorWorld.y - Math.round(centerWorld.y - viewport.y / 2 - containerOrigin.y),
    scale,
  };
}