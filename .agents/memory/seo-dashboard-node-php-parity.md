---
name: SEO dashboard Node/PHP parity
description: Shared rules for keeping live SEO dashboard diagnostics consistent across the Node API and Hostinger PHP API
---

The Node and Hostinger PHP SEO endpoints are two views of the same production archive. Their set comparisons, URL normalization, internal-link rules, and referenced-asset scans must use identical semantics; a rounded percentage must not hide a non-pass result.

**Why:** The dashboard is used to validate both local operation and the Hostinger archive. Small parser differences can report contradictory health states even when the release gate passes.

**How to apply:** When adding or changing a SEO metric, update both implementations together, compare status/value pairs from both endpoints, and use threshold comparisons that treat a complete set as pass even when a runtime represents `1` as an integer rather than a float.