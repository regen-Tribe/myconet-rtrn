# M16 — Resources

Book shared tools, spaces and other community resources. Route: `/resources` (`/resources` redirects there).

M16 shares its code, tables and rules with **M15 Accommodation** — see `../m15-bookings/README.md`. The two modules are the same `BookingsClient` with a different `scope`:

| Module | Route | Scope | Categories |
|--------|-------|-------|------------|
| M15 Accommodation | `/accommodation` | `stays` | accommodation |
| M16 Resources | `/resources` | `resources` | tools, spaces |

`SCOPE_META` in `m15-bookings/lib/inventory.ts` holds the number, label, route, accent color and categories for each. To add a new category to Resources, add it to the `category` check in the database, `CATEGORIES`/`CATEGORY_META`, and `SCOPE_META.resources.categories`.
