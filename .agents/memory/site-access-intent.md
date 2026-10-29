---
name: Site-wide password intent
description: Why the product requires a website-access gate before loading features.
---

The user requested a website-wide password prompt before any feature loads to prevent viewers misunderstanding the prototype. This gate is separate from the existing student, resident, analyst, and map-visitor entry flows; it is not an individual reporter identity.

**Why:** The owner specifically wants visitors to pass through one access step before seeing or using the site, without confusing a shared website password with account-level ownership or analyst privileges.

**How to apply:** Keep the UI and API fail-closed before access is granted, while preserving the existing role-specific login, report ownership privacy, and emergency call guidance. Never record the actual password in project files or memory.