---
name: Shared report privacy
description: Centralized-storage consent, legacy-data boundaries, and the limits of this demo's analyst access
---

The user explicitly authorized shared PostgreSQL reports and persistent file storage on 2026-10-01. This supersedes the earlier browser-local persistence decision, not the local-analysis privacy boundary.

**Why:** Cross-browser analyst review, globally persistent moderation, and an approved-only public map were expressly requested. Photo content was not authorized for external AI analysis.

**How to apply:** Keep landmark and photo-metadata suggestions local and label them as estimates. The user explicitly authorized external AI triage of submitted descriptive text on 2026-10-02; this does not authorize external photo analysis. Public responses must not expose reporter identity or pending/denied/removed records. Anonymous real descriptions and photos remain private except to their owner and analysts. Do not silently import legacy browser-only records as approved; any import must require clear consent and normal pending review.

Keep the existing simulated login roles for prototype demonstrations unless an authentication upgrade is requested. Do not describe public demo analyst credentials as secure authentication.

**Why:** The user expressly asked to preserve the current login roles and avoid unrelated changes, rather than introduce a new identity system during the persistence update.

**How to apply:** Use fictional data with the demo login. Before collecting real safety reports or promising restricted analyst access, introduce real authentication and reviewer authorization while preserving guest map access.

Preserve existing moderation decisions during verification, including decisions about fictional demos. Do not reset shared records merely to restore an expected fixture count.

**Why:** Other browsers can moderate the shared prototype while a visual check is running. A changed pending/approved/denied total can be valid live data, not a regression.

**How to apply:** Visual checks are read-only apart from entering a session. For mutating tests, create test-owned reports or demo copies and clean up only those; check live status totals rather than hardcoding initial seed counts.