---
name: Report resolution
description: Analyst workflow and the user's chosen meaning of clearing resolved reports.
---

Clearing a resolved report means archiving it and removing it from the active analyst queue and public heat map, not deleting it.

**Why:** On 2026-10-06 the user chose “Archive and remove from map” after being offered alternatives. They want an efficient analyst process: review, approve or deny, then clear reports whose follow-up is finished.

**How to apply:** Preserve the original review decision and history when archiving. The latest instructions allow pending reports to be archived without approval, and denial archives the report immediately. Reasons: Resolved, False Report, Missing Critical Information, Duplicate Report, Other. Archived and incomplete records never appear on the public map.

The analyst map's “Remove from heat map” action must use that same archive behavior and announce successful archiving. Confirm consequential queue mutations: corrections, approval, denial, and archiving.

**Why:** The user explicitly requested retention rather than deletion from the map and confirmations where necessary between review steps.

**How to apply:** Explain the outcome before saving, allow cancellation without mutation, and show success only after persistence. Bind each confirmation to the report it was opened for; advancing the queue must not cause another report to receive that action.

Keep sample reports across all workflow states while providing at least 100 approved synthetic reports with valid map locations.

**Why:** The user requested a more populated review queue, denied list, and archive so the workflow has a meaningful mix of states.

**How to apply:** When refreshing sample data, preserve that variety without reclassifying real user submissions or overwriting subsequent analyst decisions.

Keep the three workflow stages prominent and the detailed category filters in a dropdown.

**Why:** The user confirmed the three-step process works well but said showing the full category tab row alongside it is confusing.

**How to apply:** Preserve stage navigation without reintroducing a second visible row of status tabs.
