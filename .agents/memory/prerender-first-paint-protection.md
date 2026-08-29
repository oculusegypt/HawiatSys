---
name: Prerender first-paint protection
description: Preventing stale prerendered database content from flashing before the live React/API page loads.
---

Prerendered pages that are generated for SEO need route-aware first-paint protection. For the data-backed homepage, keep the snapshot visible while the live settings request runs and hide the React tree; remove both once the live app is ready. Other routes can remove their snapshot during the normal JavaScript handoff when no useful first-paint snapshot is needed.

**Why:** A static snapshot can contain older service, price, identity, or login-page content, but replacing a useful homepage snapshot with a full loading shell creates a worse LCP on slow mobile connections. The live app must still replace the snapshot before duplicate content is exposed.

**How to apply:** Give the homepage a pending handoff state that hides React until settings load, then removes the snapshot and releases the live tree. Keep generic route behavior intentional. Rebuild and inspect the final Hostinger archive, not only the source or Vite output.