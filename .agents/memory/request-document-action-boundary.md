---
name: Request document action boundary
description: Prevents request-page document buttons from bypassing their intended create flow through a legacy navigation callback.
---

Document actions must be verified from the page where the button is rendered, not only from the destination workflow. A working contract or invoice wizard does not help if the originating callback still redirects to an old query URL.

**Why:** A previous update repaired the container-system destination, while the request-details callbacks continued sending users to the legacy query route, so the reported behavior remained unchanged.

**How to apply:** Trace each action from button click through its immediate callback, then verify the compiled frontend asset contains the new action and no legacy redirect string before packaging a Hostinger update.