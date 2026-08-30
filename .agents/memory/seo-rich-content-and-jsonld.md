---
name: SEO rich content and JSON-LD
description: Durable rules for validating prerendered rich text and structured data.
---

Prerendered rich-text content must be treated as an HTML fragment: remove pasted document wrappers, preserve its text, and demote nested H1 elements so the page template remains the sole H1. JSON-LD validation must inspect objects nested under `@graph`, not only top-level blocks.

**Why:** CMS content can contain a complete pasted document and structured-data producers commonly emit valid linked graphs; checking only top-level nodes creates false failures while allowing heading duplication.

**How to apply:** Keep the fragment normalization behavior aligned between prerender and hydrated article rendering, and flatten JSON-LD graphs before applying page-type contracts.