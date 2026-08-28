---
name: Prerender first-paint protection
description: Preventing stale prerendered database content from flashing before the live React/API page loads.
---

Prerendered pages that are generated for SEO must not be visible during the normal JavaScript boot path when their content can differ from the live API. Mark the document as no-JS initially, switch it to JS synchronously in the head, hide the SEO snapshot for JS clients, and keep a loading shell until the live app mounts.

**Why:** A static snapshot can contain older service, price, identity, or login-page content. Showing it first creates a visible flash and makes the site look incorrect even though the final API response is right.

**How to apply:** Protect every prerender template, including special home-page templates that do not share the generic page renderer. Rebuild and inspect the final Hostinger archive, not only the source or Vite output.