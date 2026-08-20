---
name: Hawiat container UI integration
description: Product decision for the container-system interface and persistence model
---

The container-system interface follows the specialized Arabic tab vocabulary from the Hawiat archive, while all records remain persisted through the existing API-backed container-system model rather than archive mock data or browser local storage.

**Why:** The archive has the clearer operational information architecture, but its local mock state would bypass permissions, audit history, cross-session visibility, and existing service-request links.

**How to apply:** Add future container-system sections as API-backed views over supported record kinds; preserve the specialized workflows, reports, and settings naming without reintroducing local-only persistence.