---
name: Theme verification
description: Why SafeMap palette changes need computed-color checks on unlocked pages.
---

Verify actual computed text and input colors on unlocked pages when changing the site palette, not only the password screen or panel backgrounds.

**Why:** A dark-style pass looked correct at the password gate while legacy body-scoped tokens and higher-specificity input rules still forced dark text inside the app. Root-level tokens and a last-loaded stylesheet alone did not prevent that failure.

**How to apply:** Check a landing login input, a map heading and a report label against their backgrounds. Also check map legends and landmark labels, selected/hover/focus states, and text inside colored notices; readable headings alone do not prove these surfaces are readable. Measure translucent labels against their composited label background, not directly against the map tile. Inspect inherited body tokens and selector specificity before adding more color overrides. Preserve map severity colors independently from the surrounding UI palette.
