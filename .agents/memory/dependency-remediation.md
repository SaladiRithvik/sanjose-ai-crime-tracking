---
name: Dependency remediation
description: Compatibility and supply-chain constraints when patching transitive dependencies.
---

Preserve the minimum package release age during security remediation. If a new parent release is too recent, prefer a mature, patched transitive release that preserves the parent's module interface.

**Why:** A storage SDK update was too recent to pass the workspace safety window. Its older HTTP client still used CommonJS imports, so forcing an ESM-only UUID release would risk breaking storage at runtime despite clearing the audit.

**How to apply:** Check both advisory coverage and module exports before selecting cross-major transitive overrides. Revisit temporary overrides when a compatible parent update has matured.
