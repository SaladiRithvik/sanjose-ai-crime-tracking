---
name: Basemap verification
description: Why tile-provider verification requires inspecting actual imagery at both overview and close zoom.
---

Verify rendered map tiles, not just HTTP success, image dimensions, or advertised service metadata. Check both campus overview and close zoom in the actual target region.

**Why:** CARTO returned valid image tiles containing an API-key-required message. The alternative Esri service advertised high zoom levels but returned valid images containing “Map data not yet available” at close zoom around SJSU. Neither case was detectable as an ordinary failed tile request.

**How to apply:** Inspect representative image pixels and an app screenshot when changing providers. If native coverage stops before the permitted interactive zoom, upscale the last verified native level while keeping report and campus-reference overlays at their correct coordinates.

The available screenshot and testing browser can lack WebGL2. Seeing a working raster fallback in that browser does not verify a vector basemap's normal rendering.

**Why:** On 2026-10-03 both browser environments reported WebGL2 unavailable, and the tester could not relaunch Chromium with software-rendering flags. Fallback, interactions, and filter checks passed, but the vector rendering could not be visually exercised.

**How to apply:** Distinguish fallback verification from primary vector verification. Test the latter in a WebGL2-enabled browser; do not remove a user-authorized fallback or misreport its faded baked-in names as a regression.