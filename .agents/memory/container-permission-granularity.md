---
name: Container permission granularity
description: How the container system's admin permissions map to API record kinds.
---

The container system's write guard checks permissions using the exact record kind suffix, such as `container_system_salary_advance` or `container_system_fuel_expense`; grouped labels alone are not sufficient for a user to save those records.

**Why:** A grouped permissions screen can look complete while the API still returns 403 for less common container-system record types.

**How to apply:** Keep the exact supported record kinds available in the employee permissions editor, while grouping them visually under the Arabic container-system sections.