---
name: Node/PHP SEO parity
description: Durable lessons for keeping the development API and Hostinger PHP API equivalent for public SEO data.
---

Both public runtimes must normalize the same legacy company wording at response time as well as persist the same SEO fields. Comparing only database rows can miss drift introduced by a runtime projection.

**Why:** A full article comparison exposed descriptions that were identical in storage but differed because Node normalized legacy “منصة حاويات” wording while PHP returned the stored text unchanged.

**How to apply:** Compare every paginated public record by identity and include title, description, keywords, canonical URL, image, and indexability fields. Exercise generated aliases and detail endpoints in both runtimes before certifying a Hostinger archive.

Public list endpoints should also share default page size, deterministic tie-break ordering, and JSON field types; otherwise equal database rows can still produce different customer-facing responses.

**Why:** Final archive verification found Node/PHP drift in the article page size, date tie ordering, and JSON-encoded container features even though the underlying SQLite records matched.

**How to apply:** Treat the serialized response from both runtimes as the contract, not just row counts; compare default responses and at least one generated detail alias before release.