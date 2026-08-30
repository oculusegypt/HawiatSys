---
name: PHP CLI query probes
description: Query-string parity checks must exercise the PHP API through HTTP, not only php -r.
---

PHP CLI inclusion of the API does not populate `$_GET` from a query string stored in `REQUEST_URI`; pagination and filter probes can therefore falsely report Node/PHP drift.

**Why:** A closure verification run initially showed failures only for page and filter requests, while the same requests passed through the PHP development server.

**How to apply:** Use the PHP HTTP server for requests with query parameters. Reserve `php -r` probes for query-free routes, or explicitly populate `$_GET` before including the handler.