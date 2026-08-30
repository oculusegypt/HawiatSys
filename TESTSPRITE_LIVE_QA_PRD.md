# TestSprite Live QA & Test Specification

**Product:** مؤسسة تقي جروب — خدمات تأجير الحاويات ونقل الأنقاض ومخلفات البناء بالرياض  
**Primary public brand:** Taqi Group  
**Internal platform name:** CleanFlow Platform  
**Specification version:** 1.0  
**Prepared:** 2026-08-30  
**Execution mode:** Independent live QA, real-user journeys, read-only and non-destructive by default

> **Important:** This document is a test specification, not an audit result and not a production-readiness declaration. TestSprite must verify every outcome against the live environment. Previous PASS results, agent reports, SEO gates, parity scripts, build checks, and source-code inspection are context only and must never be accepted as proof.

## 0. Execution Contract

TestSprite must behave as an external QA engineer and a real visitor:

1. Open the real public URL in a fresh browser context.
2. Navigate by clicking visible links and CTAs, then separately open deep links directly.
3. Test both the rendered experience and the raw response that arrives before JavaScript hydration.
4. Observe HTTP status, redirects, response bodies, console messages, network requests, failed assets, layout, and visible text.
5. Use live content discovery from the homepage, sitemap, and public API rather than assuming that source fixtures are still present.
6. Do not silently convert a blocked test into PASS. Use `BLOCKED` and state the missing prerequisite.
7. Record evidence for every test. A test without evidence is not PASS.
8. Record any Node/PHP discrepancy as a bug. Do not explain it away because one implementation appears reasonable.
9. Keep all operations read-only unless the test environment and the owner explicitly authorize test-safe form submissions.
10. Never disclose, request, enter, or store credentials, tokens, passwords, API keys, session cookies, or secrets in the report.

### Prohibited actions

- No `INSERT`, `UPDATE`, `DELETE`, migrations, admin edits, settings changes, counter changes, cache purges, or file uploads.
- No real customer request, WhatsApp message, email, phone call, booking, payment, invoice, settlement, or financial transaction.
- No destructive security testing, brute force, credential guessing, fuzzing at a volume that could affect production, denial-of-service testing, or filesystem probing.
- No use of an administrator account unless the owner supplies a separate test-safe account and explicitly enables the optional authenticated suite.

## 1. Test Objective

The objective is to independently determine whether the **live platform** is usable, discoverable, technically consistent, and safe enough to hand to real visitors.

TestSprite must not trust:

- Earlier PASS results.
- Reports written by agents or developers.
- SEO quality gates.
- Node/PHP parity scripts.
- Build or archive verification.
- A successful HTTP status alone.
- A matching API schema alone.
- JSON-LD existing in the page source alone.
- A React-rendered DOM after hydration alone.

The primary question is:

> Can a real Arabic-speaking visitor open the public website, discover services/packages/articles/areas, use the important CTAs, follow deep links, refresh pages, and receive correct, stable, indexable content on desktop and mobile?

The secondary question is:

> Where public API endpoints are available, do the Node and PHP/Hostinger implementations behave the same way in live conditions, including errors, filters, pagination, aliases, field types, and null handling?

## 2. Live Environment

### 2.1 Targets

| Target | Value | Status / instruction |
|---|---|---|
| Expected Hostinger public frontend | `https://taqigroup.com/` | **Verify DNS, TLS, and current content before running.** Project documentation identifies this as the intended public origin, but it has not been independently certified as live by this specification. |
| Expected Hostinger public API | `https://taqigroup.com/api` | Same-origin PHP/PDO SQLite API if the Hostinger archive is live. Verify with `/api/healthz`. |
| Replit published frontend | Not available in the current environment metadata | Do not invent a URL. If the owner wants Replit production tested, provide the actual published URL. |
| Node API comparison target | `<NODE_API_BASE_URL>` | Missing prerequisite. Required only for Node ↔ PHP parity tests. It must be a publicly reachable, non-destructive test/staging URL, for example ending in `/api`. |
| Hostinger PHP comparison target | `https://taqigroup.com/api` | Use only after confirming it is the current Hostinger production API. |
| Main public app path | `/` | Public service website. |
| Operations platform path | `/taqi-group-platform/` | Expected Hostinger public path; verify any compatibility alias such as `/cleanflow-platform/`. This path is separate from the public services sitemap. |
| Admin login path | `/admin/login` | Protected area. Public smoke test only; do not attempt login without an owner-provided test-safe account. |

### 2.2 Environment gate

Before any test:

1. Resolve DNS and verify HTTPS certificate.
2. Fetch `/`, `/api/healthz`, `/robots.txt`, and `/sitemap.xml`.
3. Save status, final URL, response headers, and raw response snippets.
4. Confirm whether the target is Hostinger PHP, Replit, staging, or an unexpected site.
5. Confirm the site identity and current brand before continuing.
6. If the target is unavailable or is not clearly the intended site, mark all dependent tests `BLOCKED`; do not use source/build output as a substitute.

### 2.3 Missing information required before a complete run

The following information is not embedded in this PRD and must be supplied or confirmed outside the document:

1. **Confirmed live URL:** Is `https://taqigroup.com/` currently the intended production target?
2. **Node API URL:** A live/staging Node API base URL is required for Section 5 parity tests. If none is exposed, mark those tests `BLOCKED`, not PASS.
3. **Form safety policy:** Whether a dedicated test/staging environment exists where a synthetic request may be submitted. Production forms remain read-only unless explicitly authorized.
4. **Test-safe recipient policy:** If WhatsApp, phone, email, or notifications must be exercised, provide a non-customer test destination and explicit permission. Do not put the destination or credentials in this file.
5. **Optional authenticated testing:** A dedicated, least-privileged test account and its approved scope are needed for admin smoke tests. Credentials must be provided through a secure channel, never in the PRD or chat.
6. **Expected legacy redirect policy:** Confirm which old routes should be `301`, `404`, or remain accessible. When unknown, infer from live behavior and current canonical/redirect contract, then report ambiguity as an observation.
7. **Browser capability:** Confirm whether TestSprite can disable JavaScript and capture raw response HTML, request headers, console logs, and network traces. If a capability is unavailable, mark the affected checks `BLOCKED`.

## 3. Test Data Discovery

Use the live site to discover test records:

1. Parse unique URLs from `/sitemap.xml`.
2. Select at least:
   - 1 homepage URL.
   - 1 service list URL and 3 distinct service details, if available.
   - 1 package list URL and 2 distinct package details, if available.
   - 1 article index, 1 category/tag URL, and 3 distinct articles.
   - 1 area index and 3 distinct Arabic area pages.
   - 1 general SEO/location page from the public pages collection.
   - 1 page with an image-rich article and 1 page with long Arabic text.
3. Record the selected URLs in the final report.
4. Do not assume a record exists because a source file or old report mentions it.
5. For negative tests, generate only bounded examples listed in this specification.

## 4. Scenario Summary and Test Count

There are **10 scenarios** and **156 proposed atomic tests**:

| Scenario | Scope | Test IDs | Count |
|---|---|---:|---:|
| S1 | Visitor navigation and real journeys | V01–V16 | 16 |
| S2 | Content discovery and list/detail consistency | C01–C14 | 14 |
| S3 | Error, deep-link, and routing edge cases | R01–R18 | 18 |
| S4 | Node ↔ PHP/Hostinger behavioral parity | P01–P16 | 16 |
| S5 | Live SEO, raw HTML, and prerender reality | SEO01–SEO20 | 20 |
| S6 | Arabic, RTL, responsive, and browser behavior | RTL01–RTL14 | 14 |
| S7 | CTA and form behavior | CTA01–CTA16 | 16 |
| S8 | API behavior, security exposure, and data integrity | API01–API22 | 22 |
| S9 | Sitemap, robots, and public discovery | DISC01–DISC08 | 8 |
| S10 | Performance, console, network, and repeat navigation | UX01–UX12 | 12 |
| **Total** |  |  | **156** |

## 5. S1 — Visitor Navigation and Real User Journeys (V01–V16)

Run each journey in a fresh browser context, first on desktop and then repeat the relevant actions on a mobile viewport.

| ID | Exact action | Expected result and evidence |
|---|---|---|
| V01 | Open the homepage directly at the confirmed production URL. | Correct Taqi Group identity, visible main content, usable navigation, no blank screen, no blocking error. Capture URL, status, screenshot, console, and failed requests. |
| V02 | Use the visible navigation to open the services list. | Navigation reaches the intended services route without a dead link or unexpected external domain. |
| V03 | Select one service from the list using its visible card/link. | Correct service detail opens; title, Arabic content, CTA, breadcrumb/back path, and primary image correspond to the selected service. |
| V04 | Return using browser Back, then select a different service. | Previous state remains usable; second selection opens the second service rather than stale content. |
| V05 | Open the packages/container list from a visible CTA or navigation link. | Correct package list opens, not an obsolete container route or unrelated page. |
| V06 | Open one package detail from the package list. | Detail matches selected package; no raw JSON, `[object Object]`, missing image, or broken CTA. |
| V07 | Open the article/blog index from the public navigation. | Index loads real article records, pagination or loading behavior is finite, and links are clickable. |
| V08 | Open one article from the index and then use its internal link. | Article detail loads; internal link lands on the intended service, package, area, or article. |
| V09 | Open an area/location page from the public area navigation or internal link. | Arabic area page loads with location-specific content and correct breadcrumb/canonical context. |
| V10 | Use every primary homepage CTA once without submitting a real request. | Each CTA has the correct href/action, no malformed URL, and no route to a retired brand or old phone number. |
| V11 | Navigate across home → service → package → article → area using visible links. | Each transition completes, scroll position/loading state is sane, and content is not duplicated or replaced by a generic fallback. |
| V12 | Refresh a service detail, article detail, and area detail while directly on each route. | Refresh preserves the deep page and does not return to homepage, show a 404 unexpectedly, or lose metadata/content. |
| V13 | Open the public operations-platform marketing path. | Platform page is reachable at the confirmed path or a documented redirect; it does not pollute public services content or sitemap expectations. |
| V14 | Open privacy and terms pages from the footer. | Both pages resolve, are readable in Arabic/RTL, and have an intentional indexability/canonical policy. |
| V15 | Use browser Back and Forward across at least five public pages. | History transitions match the visible page, without stale content, duplicated navigation entries, or a blank state. |
| V16 | Repeat the main journey with a mobile viewport and slow network emulation if available. | Navigation, cards, hero, images, CTAs, and long Arabic text remain usable; capture any layout or loading failure. |

## 6. S2 — Content Discovery and List/Detail Consistency (C01–C14)

The selected records must come from live sitemap/API/page discovery. Compare list cards with their detail pages.

| ID | Exact action | Expected result and evidence |
|---|---|---|
| C01 | Load the services list and record all visible services, slugs, titles, and links. | List is valid JSON/HTML as applicable, records are unique, links are non-empty, and labels are not legacy branding. |
| C02 | Open at least three service details from C01. | Every selected detail has the same identity/title/slug as its list record and contains visible main content. |
| C03 | Inspect each service's optional fields such as icon, image, SEO enabled state, and description. | Types render safely; null/empty optional fields do not break cards or details. |
| C04 | Load the package/container list and record all visible package records. | Package records are distinct from services where the product contract says they are distinct; no stale category naming. |
| C05 | Open at least two package details from C04. | List-to-detail identity matches; features render as readable values rather than JSON text or `[object Object]`. |
| C06 | Load the article index with its default page size. | Default response/page behavior is stable; article cards have title, link, and any expected date/image fields. |
| C07 | Open three article details from different positions in the index or sitemap. | Each detail has the correct article, readable rich content, image behavior, and internal links. |
| C08 | Open the article categories view. | Categories load without an empty shell, links resolve, and a selected category does not silently show all content if filtering is expected. |
| C09 | Open tag/filter links discovered on the article index or details. | Tag filters return the expected subset, preserve Arabic labels, and handle zero results gracefully. |
| C10 | Load the public SEO/location pages collection or discover three such pages from the sitemap. | Pages are accessible and not accidentally treated as articles/services with the wrong metadata type. |
| C11 | Compare one list record, one detail response/page, and its sitemap URL. | Slug, ID, title, canonical URL, and indexability policy are coherent across all three surfaces. |
| C12 | Search or filter content using a valid Arabic term and a term with no matches, where the UI exposes this capability. | Valid results are relevant; zero results are explicit and usable, not an infinite spinner or stale previous result. |
| C13 | Inspect content with missing/optional image, date, excerpt, or metadata fields. | Page remains readable and does not emit broken image URLs, empty anchors, or raw internal fields. |
| C14 | Repeat C01–C11 after a hard refresh and from direct URLs. | Content is reproducible after reload and does not depend solely on a previous navigation or hydration cache. |

## 7. S3 — Error, Deep-Link, and Routing Edge Cases (R01–R18)

For every case record requested URL, status, redirect chain, final URL, title, visible error state, canonical, and raw HTML evidence.

| ID | Exact action | Expected result |
|---|---|---|
| R01 | Open a clearly nonexistent top-level route such as `/this-route-does-not-exist`. | Intentional `404` or documented fallback; not an HTTP 200 that looks indexable. |
| R02 | Open a nonexistent service slug under `/services/`. | Intentional `404` or documented redirect; no unrelated service rendered as if it matched. |
| R03 | Open a nonexistent package slug under `/packages/`. | Intentional `404` or documented redirect; no generic success disguised as a detail. |
| R04 | Open a nonexistent article slug under `/posts/`. | Intentional `404` or documented redirect; no stale article content. |
| R05 | Open a nonexistent area slug under `/areas/`. | Intentional `404` or documented redirect; no wrong-area content. |
| R06 | Open a valid Arabic area slug in unencoded form. | Browser/server handles Unicode correctly, page identity is correct, and no encoding corruption appears. |
| R07 | Open the same Arabic slug percent-encoded. | Result matches R06 or follows an intentional canonical redirect; no duplicate-content ambiguity. |
| R08 | Open an Arabic service/article/page alias discovered from live links or sitemap. | Alias resolves to the correct record and canonicalizes to the intended URL. |
| R09 | Append a trailing slash to a valid page. | Behavior is consistent: intentional `200` or redirect; canonical points to one stable URL. |
| R10 | Remove a trailing slash from a valid page. | Same consistency requirement as R09; no routing break or duplicate canonical. |
| R11 | Add harmless query parameters such as `?utm_source=testsprite&ref=qa`. | Page remains functional; tracking parameters do not change content or canonical incorrectly. |
| R12 | Add an invalid query parameter/value and an empty parameter. | Request fails safely or ignores the value; no stack trace, SQL/DB error, or sensitive detail. |
| R13 | Open a valid deep URL directly in a new browser context. | Direct load matches navigation load, including content, metadata, status, and assets. |
| R14 | Open a slug with excessive but bounded length and Unicode punctuation. | Safe `404`/validation response; no 500, timeout, reflected input, or filesystem detail. |
| R15 | Test a case variant of a Latin slug where the route is case-sensitive/insensitive by contract. | Actual behavior is consistent and canonicalized; unexpected duplicate indexable pages are bugs. |
| R16 | Open known legacy/compatibility route variants from the current live link inventory. | Each route is either intentional redirect, intentional 404, or valid compatibility page; record the observed contract. |
| R17 | Open a malformed percent-encoded URL and a mixed Arabic/English path. | Safe client/server response; no blank screen, uncaught exception, or malformed canonical. |
| R18 | Refresh every valid and invalid deep URL tested above. | Refresh preserves the same intentional outcome; no SPA-only navigation illusion. |

## 8. S4 — Node ↔ PHP/Hostinger Behavioral Parity (P01–P16)

Run only if `<NODE_API_BASE_URL>` is supplied and both targets are reachable. If not, mark P01–P16 `BLOCKED` with the exact missing URL. Do not substitute source code or local servers for live behavior.

For every pair, send the same safe `GET` request to:

- Node: `<NODE_API_BASE_URL><path>`
- PHP: `https://taqigroup.com/api<path>`

Compare status, content type, JSON shape, field names, field types, null/empty handling, ordering, pagination, and error body. Save both raw responses and a normalized diff.

| ID | Paired request | Expected result |
|---|---|---|
| P01 | `GET /healthz` | Both respond with the intended health contract; no environment secrets or internal paths. |
| P02 | `GET /services` | Same public records, fields, field types, ordering, and null handling. |
| P03 | `GET /services/<valid-slug>` | Same detail record and not-found behavior for the same valid slug. |
| P04 | `GET /containers` and `/packages` aliases | Alias routes expose the same intended package data or documented route policy. |
| P05 | `GET /containers/<valid-slug>` and `/packages/<valid-slug>` | Detail aliases resolve identically where contract says they are aliases. |
| P06 | `GET /posts` with default pagination | Same default page size, total/count fields, ordering, and date types. |
| P07 | `GET /posts?page=2&limit=5` | Same page boundaries, next/previous metadata, and stable records. |
| P08 | `GET /posts?category=<known-category>` | Same category-filtered set and category field semantics. |
| P09 | `GET /posts?tag=<known-tag>` | Same tag-filtered set and tag field semantics. |
| P10 | `GET /posts?category=<known-category>&tag=<known-tag>` | Combined filters have identical intersection semantics; no filter silently dropped. |
| P11 | `GET /posts/<valid-slug>` | Same article detail, rich content fields, media fields, and date/null handling. |
| P12 | `GET /pages` with default pagination/list parameters | Same SEO-page collection, ordering, and pagination behavior. |
| P13 | `GET /pages/<valid-slug>` and one Arabic alias | Same page resolution and canonical-facing identity. |
| P14 | Boundary pagination: page 0, negative page, limit 0, limit above a safe maximum. | Both validate or normalize consistently with safe, documented errors; no 500. |
| P15 | Empty-result filters and malformed/nonexistent slugs. | Both return the same intentional `200` empty or `404` contract and safe error shape. |
| P16 | Compare representative response headers and CORS behavior for all public requests. | Content type, cache behavior, allowed origin/header behavior, and status are compatible for the browser use case. |

## 9. S5 — Live SEO, Raw HTML, and Prerender Reality (SEO01–SEO20)

Run on at least: homepage, 3 service details, 2 package details, 3 articles, 3 area pages, 3 SEO/location pages, services/packages/articles indexes, and the platform page. Include both a browser-rendered inspection and a raw HTTP fetch before JavaScript.

| ID | Exact action | Expected result and evidence |
|---|---|---|
| SEO01 | Fetch the homepage raw HTML without executing JavaScript. | HTTP status and response are captured; title and meaningful content exist before hydration. |
| SEO02 | Fetch one service detail raw HTML directly. | Title, description, canonical, H1, and service main content are present before hydration. |
| SEO03 | Fetch one package detail raw HTML directly. | Package identity, title, canonical, H1, and meaningful content are present before hydration. |
| SEO04 | Fetch one article detail raw HTML directly. | Article title, description, canonical, H1, readable content, and expected article structured data exist before hydration. |
| SEO05 | Fetch one area page raw HTML directly. | Arabic area title/content, canonical, H1, and location-relevant content exist before hydration. |
| SEO06 | Fetch one SEO/location page raw HTML directly. | Correct page type and content are present before hydration, not only a generic app shell. |
| SEO07 | Capture browser title for every selected page type. | Title is non-empty, relevant, unique where expected, and not an internal artifact name. |
| SEO08 | Inspect one meta description per page type from raw HTML. | Description is present, readable, relevant, not duplicated across unrelated pages, and not an implementation placeholder. |
| SEO09 | Inspect canonical link on every selected page. | Exactly one intended canonical or documented absence; canonical uses HTTPS, correct host, correct path, and matches the final URL policy. |
| SEO10 | Compare canonical with redirect-final URL for slash, alias, and query variants. | Canonical consistently identifies the preferred URL and never points to localhost, Replit, or a different record. |
| SEO11 | Inspect robots meta/header. | Indexable public pages are not accidentally `noindex`; private/admin/API/error pages are not advertised as indexable. |
| SEO12 | Count and inspect H1 elements on each selected page. | Exactly one meaningful visible H1 per content page, with correct Arabic/English content. |
| SEO13 | Inspect visible main content before and after hydration. | Hydration does not replace real content with an error, duplicate H1, duplicate article, or empty shell. |
| SEO14 | Inspect Open Graph title, description, URL, type, and image. | Values match the actual page, canonical host, and available image; no stale brand or broken URL. |
| SEO15 | Inspect Twitter metadata. | Card/title/description/image are present where required and match page identity without malformed values. |
| SEO16 | Parse all JSON-LD blocks on selected pages, including `@graph`. | JSON is valid; type and identity match page; no duplicate conflicting entities; required fields are meaningful. |
| SEO17 | Inspect rich article/page content and FAQ/GEO content where the page promises it. | Content is an HTML fragment inside one page template, not a second template H1 or escaped raw markup. |
| SEO18 | Crawl a bounded sample of internal links from each selected page. | Links resolve, stay on intended host/routes, do not point to retired brand paths, and have no obvious dead links. |
| SEO19 | Inspect image `src`, `alt`, dimensions/loading behavior, and image sitemap references. | Images load or fail gracefully; alt text is meaningful; no legacy/orphan URL is emitted; no broken asset spam. |
| SEO20 | Disable JavaScript if possible or use raw HTTP plus a crawler-like fetch for all page types. | The final verdict is based on pre-hydration HTML as well as the hydrated browser view; JS-only content is recorded as a finding. |

## 10. S6 — Arabic, RTL, Responsive, and Browser Behavior (RTL01–RTL14)

Run on Chromium desktop, mobile viewport, and tablet viewport if available. Use actual Arabic records and long titles discovered live.

| ID | Exact action | Expected result |
|---|---|---|
| RTL01 | Inspect document direction and primary layout on homepage and one detail page. | `dir`, text alignment, navigation order, breadcrumbs, and controls behave as Arabic RTL content requires. |
| RTL02 | Open a URL containing an Arabic slug in browser address bar. | Unicode path remains valid, readable, and stable through reload/redirect. |
| RTL03 | Open a mixed Arabic/English slug or title page. | Mixed text does not reorder confusingly, clip, or corrupt punctuation. |
| RTL04 | Inspect long Arabic service/article/area titles at mobile width. | Text wraps naturally without overlap, clipped words, horizontal page overflow, or hidden CTA. |
| RTL05 | Inspect punctuation, parentheses, numbers, phone text, and Latin brand terms in Arabic paragraphs. | Visual direction and punctuation order remain understandable; no mojibake. |
| RTL06 | Use mobile navigation open/close/back behavior. | Menu is reachable, dismissible, keyboard/touch usable, and does not trap or hide page content. |
| RTL07 | Inspect service/package/article cards in Arabic. | Titles, excerpts, badges, prices/labels if present, images, and actions fit without overflow. |
| RTL08 | Inspect breadcrumbs and back links on mobile and desktop. | Order and separators are correct for RTL and point to valid routes. |
| RTL09 | Inspect primary/secondary buttons and CTA labels with long Arabic strings. | Buttons remain readable, tappable, and do not overflow or become visually detached from their action. |
| RTL10 | Resize viewport across desktop, tablet, and mobile while on a deep page. | Layout reflows without blank regions, jumps, broken images, or inaccessible content. |
| RTL11 | Test browser Back/Forward after Arabic URL navigation. | History and visible content remain aligned; encoding is preserved. |
| RTL12 | Inspect fonts and fallback behavior with Arabic characters and Unicode symbols. | No missing glyph boxes, unreadable fallback, or excessive layout shift. |
| RTL13 | Repeat a representative journey in a second Chromium context/profile. | No session-local state or cached hydration artifact is required for correct public rendering. |
| RTL14 | Capture screenshots of any visual issue at the viewport where it occurs. | Every confirmed defect includes viewport dimensions, URL, language/content sample, and screenshot. |

## 11. S7 — CTA and Form Behavior (CTA01–CTA16)

The first pass is link/action verification only. Do not send a real request. Form submission tests are allowed only in an explicitly approved test-safe environment with synthetic data.

| ID | Exact action | Expected result |
|---|---|---|
| CTA01 | Inspect every visible WhatsApp CTA on homepage, service, package, article, area, and contact surfaces. | Correct scheme/URL, correct destination/number, no old number, malformed encoding, dead link, or legacy route. |
| CTA02 | Inspect every phone CTA. | `tel:` target is valid and matches the current public number; no obsolete number. |
| CTA03 | Inspect contact-page and contact-footer links. | Correct route and reachable content; no loop, dead link, or old brand identity. |
| CTA04 | Inspect booking/request/service-inquiry CTAs without submitting. | Action opens the intended form/modal/route and preserves selected service/package context. |
| CTA05 | Start a request from a service detail. | Form is prefilled with the correct service or context; no stale previous selection. |
| CTA06 | Start a request from a package detail. | Form is prefilled with the correct package/container context; no wrong entity mapping. |
| CTA07 | Open each CTA in the expected same/new tab behavior. | No popup blocker-dependent dead end, unexpected download, or external URL mismatch. |
| CTA08 | Use a CTA after navigating Back from another page. | Action remains wired and does not use stale route/query state. |
| CTA09 | Open a form and inspect required fields. | Labels, required indicators, input types, and Arabic text are visible and understandable. |
| CTA10 | Submit an empty form only if the test-safe policy allows it. | Client/server validation is clear; no request is created; no raw JSON/stack trace appears. Otherwise mark BLOCKED. |
| CTA11 | Enter invalid formats and overlong bounded values in a test-safe environment. | Validation is clear and safe; no 500, internal error, or reflected unsafe markup. |
| CTA12 | Enter Arabic names/notes and mixed Unicode in a test-safe environment. | Input preserves Arabic correctly and success/error states remain readable. |
| CTA13 | Perform one valid synthetic submission in an approved test environment. | Loading, success, and resulting user-visible state are correct; capture request/response without secrets. |
| CTA14 | Repeat the same synthetic submission once to check duplicate handling. | Duplicate is prevented, explicitly acknowledged, or safely handled according to contract; no accidental real duplication. |
| CTA15 | Simulate a slow/failing request only with a safe test endpoint/environment. | Loading state terminates; error is understandable; form does not silently claim success. |
| CTA16 | Inspect form success/error rendering after refresh or navigation. | No raw object, stack trace, internal API detail, or false success remains visible. |

## 12. S8 — API Behavior, Security Exposure, and Data Integrity (API01–API22)

Public API tests must be bounded `GET` requests unless a safe `OPTIONS` request is useful. Do not mutate data.

| ID | Exact action | Expected result |
|---|---|---|
| API01 | `GET /api/healthz`. | Intentional success JSON/text, correct content type, no secret/config disclosure. |
| API02 | `GET /api/services`. | Valid JSON, stable schema, correct array/envelope, correct field types, no internal fields. |
| API03 | `GET /api/containers` and `/api/packages`. | Valid public data and intentional alias behavior. |
| API04 | `GET /api/posts` with no parameters. | Stable default pagination and ordering; no duplicate records. |
| API05 | `GET /api/pages` with no parameters. | Stable public SEO-page collection; no admin-only fields. |
| API06 | Request missing/invalid pagination parameters. | Intentional 400/normalized result; never 500 or stack trace. |
| API07 | Request page beyond available results. | Valid empty result with stable schema, not an exception or previous-page replay. |
| API08 | Request filters that produce zero results. | Explicit empty result and safe metadata. |
| API09 | Request malformed, overlong, encoded, and Unicode slugs within bounded size. | Safe 400/404 behavior, no SQL/DB error, filesystem path, or reflected internals. |
| API10 | Request a nonexistent resource ID/slug. | Intentional 404 contract with safe human-readable error. |
| API11 | Inspect `Content-Type`, charset, cache, and security-relevant response headers. | Headers are compatible with browser behavior and do not expose debug details. |
| API12 | Send a harmless `OPTIONS` request where supported. | CORS/preflight behavior allows only intended origins/methods/headers and does not expose credentials broadly. |
| API13 | Request protected admin endpoint without a session, such as `/api/admin/seo/metrics`. | Protected response is 401/403 as contracted; it must not leak data or internal error details. |
| API14 | Open protected admin UI route without a session. | Login or intentional access-denied state; no admin records or controls become public. |
| API15 | Request a malformed protected path and malformed JSON only if no mutation is triggered. | Safe error; no stack trace, DB error, absolute path, token, or SQL detail. |
| API16 | Search raw HTML and API responses for secrets, session values, filesystem paths, debug banners, and internal hostnames. | None appear in public responses. Record exact evidence if found, redacting secret values. |
| API17 | Search public HTML, metadata, JSON-LD, sitemap, robots, image alt, and API text for retired brand/container terminology. | No unintended legacy commercial identity or obsolete URL appears. |
| API18 | Compare list counts to distinct linked details for sampled services/packages/articles/pages. | No duplicate IDs, broken list-to-detail mapping, or missing referenced record. |
| API19 | Re-fetch the same GET endpoint repeatedly in one session and a fresh session. | Deterministic ordering and schema; no session-specific leakage. |
| API20 | Inspect public tracking/analytics endpoints only through normal page behavior or safe GETs. | No customer identity or operational evidence is exposed to unauthenticated visitors. |
| API21 | Sample response JSON for internal audit, employee, driver, financial, or admin-only fields. | Public projection excludes sensitive operational/financial data. |
| API22 | Verify error bodies for 400/404/401 cases are JSON or intentional text and do not contain `[object Object]`. | Error contract is stable, understandable, and non-sensitive. |

## 13. S9 — Sitemap, Robots, and Public Discovery (DISC01–DISC08)

| ID | Exact action | Expected result |
|---|---|---|
| DISC01 | Fetch `/robots.txt`. | HTTP success, valid directives, correct sitemap reference, and no accidental disallow of the whole public site. |
| DISC02 | Fetch `/sitemap.xml`. | HTTP success, valid XML, correct host, no localhost/Replit/dev URLs, no duplicate `<loc>` values. |
| DISC03 | Parse every sitemap URL in a bounded live run. | Each URL has an intentional status and is not a broken or admin/API route. |
| DISC04 | Sample homepage, service, package, article, area, and SEO-page URLs from sitemap. | Sample URLs load with status/canonical/indexability consistent with sitemap inclusion. |
| DISC05 | Compare sitemap URLs with page canonical URLs for the sample. | Canonical and sitemap agree on preferred URL, host, scheme, and slash policy. |
| DISC06 | Inspect sitemap image references and fetch a bounded sample. | Image URLs are reachable or intentionally handled; no old/orphaned asset references. |
| DISC07 | Verify admin, API, platform-separation, and error URLs are not incorrectly included as public service content. | Discovery boundary matches the product contract. |
| DISC08 | Re-fetch sitemap and robots after a fresh browser/session context. | Responses are stable and do not depend on prior hydration or cookies. |

## 14. S10 — Performance, Console, Network, and Repeat Navigation (UX01–UX12)

Measure with a fresh context at desktop and mobile sizes. Use a normal run and, where supported, a throttled slow-network run.

| ID | Exact action | Expected result and evidence |
|---|---|---|
| UX01 | Cold-load homepage and record timing, screenshot, console, and network. | No blank screen, infinite spinner, fatal console error, or failed critical request. |
| UX02 | Cold-load a service, package, article, area, and platform deep link. | Each begins with a useful visible state and settles without hydration mismatch or route reset. |
| UX03 | Navigate repeatedly through at least ten public pages. | No progressive slowdown, duplicate requests, memory-like UI degradation, or stale content. |
| UX04 | Throttle network and open homepage. | Loading state is intentional, critical content eventually resolves, and errors are recoverable. |
| UX05 | Throttle network and open an image-rich article. | Hero/first image loading is prioritized; no broken image flood or severe layout shift. |
| UX06 | Observe layout during initial load and after images/fonts load. | No material layout jump that obscures controls or changes the user's intended click target. |
| UX07 | Capture all browser console output during S1–S3. | Any error, uncaught exception, hydration warning, failed source map, or suspicious warning is recorded with URL and reproduction. |
| UX08 | Capture all failed network requests during S1–S3. | Any 4xx/5xx asset/API request, CORS failure, mixed-content request, or font/image/script failure is recorded. |
| UX09 | Inspect requests for localhost, private IP, Replit dev domains, or obsolete production hosts. | Public browser must not depend on development-only or inaccessible origins. |
| UX10 | Test responsive transition while a request/modal/menu is open. | Component remains usable and does not lose input, overlay focus, or close controls. |
| UX11 | Hard reload after repeated navigation and after a failed request. | App recovers to a valid page without cached error shell or infinite loading. |
| UX12 | Compare desktop/mobile screenshots for homepage and one deep page. | Core hierarchy, Arabic readability, images, navigation, and CTAs are functionally equivalent across viewports. |

## 15. Expected HTTP and Routing Contract

TestSprite must infer final behavior from live responses and visible links, but use these expectations as a review frame:

| Surface | Expected behavior |
|---|---|
| Valid public page | `200` with visible content, unique metadata, correct canonical, and working assets. |
| Valid preferred URL variant | `200`, or intentional redirect to the preferred URL. |
| Trailing-slash/alias variant | Stable intentional policy; normally one canonical URL and no duplicate indexable content. |
| Invalid public slug | `404` or documented redirect; never a misleading indexable `200`. |
| Invalid API resource | `404` with stable safe error body. |
| Invalid API parameters | `400` or documented normalization; never an opaque `500`. |
| Unauthenticated admin API | `401`/`403`, with no sensitive body. |
| Unauthenticated admin UI | Login/access-denied flow, not public admin content. |
| Sitemap/robots | `200`, correct content type, valid content, correct origin. |

If actual behavior differs from this frame, inspect current links and canonical contract before classifying it. Do not silently rewrite the result into PASS.

## 16. Legacy Data and Branding Regression Search

Search the **live** response body and browser-visible content, not only source files, for:

- Retired brand names and old company names.
- Old phone numbers or WhatsApp destinations.
- Old container business identity or obsolete package terminology.
- Old domain, route, image, or API URLs.
- Legacy names in title, description, canonical, OG/Twitter metadata, JSON-LD, H1, alt text, footer, sitemap, robots, or error pages.

Classify an occurrence as:

- **BUG** when it is customer-visible, indexable, or sent as a public API field.
- **Observation** when it is clearly an internal non-commercial identifier with no public exposure.

Do not use the existence of an internal compatibility string as a reason to ignore a customer-visible occurrence.

## 17. Evidence and Reporting Requirements

### 17.1 Evidence per test

Every test record must include:

- Test ID.
- Scenario.
- Environment and exact base URL.
- Exact URL, including query string.
- Viewport and browser.
- Timestamp with timezone.
- Exact user action/request.
- Expected result.
- Actual result.
- Status: `PASS`, `FAIL`, `BLOCKED`, or `OBSERVATION`.
- HTTP status and redirect chain, where relevant.
- Screenshot when visual behavior or a bug is involved.
- Raw HTML snippet or saved response reference for SEO/raw HTML tests.
- Network evidence for failed requests, API behavior, CORS, or redirects.
- Console evidence for errors/warnings.
- Reproduction steps for every failure.
- Severity and suspected affected surface.

### 17.2 Evidence rules

- Never write PASS without evidence.
- `HTTP 200 != Functional PASS`.
- `SEO JSON-LD exists != SEO PASS`.
- `API schema matches != User Journey PASS`.
- `Build succeeds != Production PASS`.
- A page that works only after client-side hydration cannot PASS the raw HTML/prerender check.
- A page that appears visually correct but emits a console error or failed critical request must record that finding separately.
- Redact credentials, tokens, cookies, phone numbers if the owner classifies them as sensitive, and any personal customer data from screenshots/logs.

## 18. Bug Classification

### P0 — Critical

Production is unavailable, the public site is broadly broken, protected data is publicly exposed, or a critical flow causes unsafe real-world action/data loss.

### P1 — High

Core service/package/article/navigation flow is broken; public data is materially wrong; Node/PHP behavior differs; valid Arabic/deep URLs fail; critical SEO/indexability/canonical behavior is broken; or a major CTA points to a wrong/dead destination.

### P2 — Medium

Important feature is defective but a reasonable workaround exists; a subset of filters/pagination/forms/responsive states fails; repeated console/network failures affect a meaningful surface.

### P3 — Low

Minor visual inconsistency, copy issue, non-critical alignment/spacing problem, or limited browser/viewport defect without loss of core function.

### Observation

An ambiguity or non-blocking behavior worth review but not confirmed as a bug. Observations must still include evidence.

## 19. Anti-False-PASS Rules

TestSprite must reject these conclusions:

> PASS because the code looks correct.

> PASS because an internal test previously passed.

> PASS because the endpoint returned HTTP 200.

> PASS because JSON-LD exists somewhere in the response.

> PASS because the SPA rendered content after hydration.

> PASS because the build/archive contains the expected file.

Instead, confirm the final user-visible and crawler-visible behavior with independent evidence. When the live environment, Node URL, raw HTML capability, or test-safe form policy is missing, report `BLOCKED` and identify the exact missing prerequisite.

## 20. Final Report Format

The final TestSprite report must contain:

### Executive Verdict

Choose exactly one:

- `PRODUCTION READY`
- `PRODUCTION READY WITH WARNINGS`
- `NOT PRODUCTION READY`

Do not choose a verdict if the live environment gate was not completed; use a clearly labeled `BLOCKED / INSUFFICIENT LIVE ACCESS` preliminary result instead of pretending the product is ready.

### Test Summary

- Total proposed tests: 156.
- Tests executed.
- Passed.
- Failed.
- Blocked.
- Observations.
- Coverage by scenario S1–S10.
- Environments, URLs, browsers, viewports, and timestamps.

### Critical Bugs

List P0 and P1 issues first, followed by P2/P3. For each:

- Bug title.
- Severity.
- Affected URL/API.
- Reproduction steps.
- Expected result.
- Actual result.
- User/crawler impact.
- Screenshot/network/console/raw HTML evidence.

### Regression Findings

State whether any retired brand, route, phone, package terminology, canonical, SEO, API, RTL, or data-integrity regression appeared in live output.

### Node/PHP Findings

For every parity mismatch, include both request URLs, both statuses, normalized response diff, and user impact. Never mark the pair as equivalent based only on one implementation or a source comparison.

### Evidence Index

Provide links or artifact names for screenshots, raw responses, HAR/network traces, console logs, sitemap samples, and reproduction videos if available.

### Independent Conclusion

The conclusion must state what TestSprite observed in the live environment, what was blocked, and why the verdict is independent of previous agent/internal reports.

## 21. Priority Order for the First Run

If execution time is constrained, run in this order:

1. **P0/P1 discovery:** environment gate, homepage, critical deep links, admin exposure smoke, public API health, console/network failures.
2. **Core user journeys:** V01–V13, C01–C11, CTA01–CTA08.
3. **Raw SEO and prerender:** SEO01–SEO13, SEO20, DISC01–DISC05.
4. **Arabic/mobile:** RTL01–RTL10 and UX01–UX06.
5. **Parity:** P01–P16 when the Node URL is available.
6. **Bounded edge cases and safe form tests:** R01–R18, API06–API22, CTA09–CTA16.

The priority order must not reduce the evidence requirements or convert unexecuted tests into PASS.
