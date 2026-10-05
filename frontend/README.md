# Crackers Shop — Storefront & Admin Panel

React 18 + Vite 6 + Tailwind 3 single-page app for the Anish Enterprises
crackers shop. It serves two audiences from one build: the public storefront
(visitor-facing) and the admin panel (staff-only, permission-gated).

The backend API lives in `../backend` and is documented in
[`../backend/README.md`](../backend/README.md). For a project-wide overview see
[`../README.md`](../README.md).

---

## 1. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 20 |
| npm | >= 10 |

The API must be running on http://localhost:5000 for admin login, catalogue
sync and order placement. The storefront shell renders without it.

---

## 2. Install and run

```bash
npm install
npm run dev      # http://localhost:5173
```

`predev` regenerates `src/data/imageManifest.json` from `public/images/` and
`src/data/products.js`, so product artwork stays in step with the catalogue.
The same hook runs before `npm run build`.

### Environment

Optional. Everything has a working default.

```bash
# frontend/.env
VITE_API_URL=http://localhost:5000
```

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `/api` in the app, `http://localhost:5000` for the dev proxy | Where the API lives. In dev the value drives the proxy target; in the browser it is the request base URL. A trailing `/api` is stripped for the proxy target. |

Only `VITE_`-prefixed vars reach the browser, and they are public by definition.
Never put a secret here.

### Dev proxy

`vite.config.js` proxies `/api/*` to the API origin. This keeps the browser on
one origin during development, so the HttpOnly session cookie and CORS behave
exactly as they will in production.

---

## 3. Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm run lint` | ESLint over `src` (js + jsx) |
| `npm run typecheck` | `tsc -p jsconfig.json` — JSDoc-aware, `noEmit` |
| `npm test` | All five smoke suites |
| `npm run test:catalog` | Catalogue integrity: prices, codes, categories, stock |
| `npm run test:orders` | Order maths, status pipeline, payment settlement |
| `npm run test:notifications` | Notification projection from real orders |
| `npm run test:auth` | Role permissions and session handling |
| `npm run test:documents` | Export helpers (print / Word / CSV / Excel) |
| `npm run verify` | `lint` → `typecheck` → `test` → `build` |

### How the smoke tests run without a browser

`scripts/register-loader.mjs` registers `extension-resolver.mjs` as a Node
resolve hook. App source uses extensionless relative imports (Vite resolves
them); Node does not, so the hook appends `.js`, `.jsx` or `/index.js`. Each
suite then stubs `window` / `localStorage` and imports the real modules
directly. No jsdom, no test framework, no browser.

### Standalone checks

Not part of `npm test` — run them by hand.

| Script | Purpose |
|---|---|
| `node scripts/image-manifest.mjs` | Rebuild `src/data/imageManifest.json` |
| `node scripts/contrast-audit.mjs` | Flag low-contrast text/background pairs |
| `node scripts/theme-check.mjs` | Verify the Tailwind token ramp is internally consistent |
| `node scripts/encoding-check.mjs` | Detect mojibake / broken characters in source |
| `node scripts/light-surface.mjs` | Codemod: former dark-surface classes → light equivalents |
| `node scripts/image-render-check.mjs` | Server-render components and confirm each artwork path exists |

---

## 4. Routes

### Storefront (`src/pages/`)

| Path | Screen |
|---|---|
| `/` | Home |
| `/products` | Catalogue with search, filters, sort, grid/list toggle |
| `/products/:id` | Product detail |
| `/categories/:slug` | Redirects to `/products?category=…` |
| `/combo-packs` | Combo & gift packs |
| `/cart` | Cart → enquiry form in one flow |
| `/about`, `/contact`, `/reviews`, `/faq` | Content pages |
| `/sivakasi-wholesale-crackers` | Wholesale landing page |
| `/privacy`, `/terms`, `/safety` | Policy pages |
| `/enquiry/form`, `/enquiry/success` | Legacy enquiry paths, still resolve |

`/categories` and `/enquiry` redirect to `/products` and `/cart`.

### Admin (`src/admin/`)

`/admin/login` is public. Everything under `/admin` is wrapped in a single
`RequireAuth` guard at the layout, then each child adds its own permission, so
the shell never renders without a session and a role only reaches the screens
it can use.

| Path | Screen | Permission |
|---|---|---|
| `/admin` | Dashboard | `dashboard.view` |
| `/admin/products` | Products | `products.view` |
| `/admin/categories` | Categories | `categories.view` |
| `/admin/combo-packs` | Combo & gift packs | `packs.view` |
| `/admin/inventory` | Stock | `products.view` |
| `/admin/import` | Excel import | session |
| `/admin/orders` | Orders | `orders.view` |
| `/admin/enquiries` | Enquiries | `orders.view` |
| `/admin/payments` | Payments | `orders.view` |
| `/admin/customers` | Customers | `customers.view` |
| `/admin/notifications` | Notification history | `dashboard.view` |
| `/admin/reports` | Reports | `reports.view` |
| `/admin/contact` | Contact details | `contact.edit` |
| `/admin/settings` | Shop settings | `settings.view` |
| `/admin/testimonials`, `/admin/content` | Content editors | session |

Anything unmatched renders `NotFoundPage`.

---

## 5. Roles and permissions

Defined in `src/services/auth.js`. `useAdminAuth` exposes `can(permission)`,
`isOwner` and the live user; `RequireAuth` consumes it.

| Role | Grants |
|---|---|
| `owner` | `*` — everything |
| `admin` | dashboard, orders, products, categories, packs, customers, reports, contact, settings |
| `staff` | dashboard, orders, products (view), categories (view), packs (view), customers (view) |

The session is an HttpOnly cookie issued by `POST /api/auth/login`. No
credential is ever written to `localStorage`, `sessionStorage` or the DOM.
`localStorage` holds only a cached user object so a reload can paint the panel
before `GET /api/auth/me` answers; the server remains the authority and
`logout` invalidates the session server-side.

---

## 6. State model

```
App
└── ContentProvider      site copy, contact details, policies, socials
    └── CatalogProvider  products, categories, packs → derived catalog
        └── CartProvider cart lines
            └── AppRoutes
```

Each provider splits into `<Name>Context.jsx` (the implementation) and
`<Name>ContextValue.js` (the context object). That keeps the module graph free
of cycles between provider and consumer.

### Catalog

`CatalogProvider` holds the three editable record sets and derives the catalog
through `buildCatalog(products, categories)` in `src/data/catalog.js` — prices,
discounts, category counts and the search index all come from that one function.
The shop and the panel therefore cannot disagree.

- Seeds apply only when nothing is stored. An empty array is a deliberate choice
  made in the panel (every product removed) and is respected.
- Renaming a category carries every product across with it.
- A `storage` listener keeps a second tab in sync.
- The provider registers its live lookups with `setOrderCatalogLookup`, so new
  cart and enquiry lines are priced from the same records the shop renders.

### Content

`siteContentVersion` in `src/data/siteContent.js` is bumped whenever the
published business identity changes. Stored copies older than the current
version have their identity fields (name, phones, email, address, map links,
social profiles) re-seeded from the defaults, while admin edits made after the
bump are preserved. Lower the risk of shipping a stale phone number by bumping
this, not by hand-editing stored data.

### Orders

`src/services/orders.js` owns the order pipeline and all reporting maths.

- Statuses: `Pending → Confirmed → Processing → Shipped → Delivered`, plus
  `Cancelled`.
- Payment statuses: `Unpaid`, `Partial`, `Paid`, `Refunded`. The recorded
  `paidAmount` is the fact; the status is derived from it, so a record cannot
  claim a part payment that has actually been settled.
- Orders read back through a migration that drops prototype demo rows, maps
  retired statuses onto the current pipeline, and recomputes totals.
- Reports (revenue, open value, outstanding, sales by day/category, top
  products, payment and status breakdowns) are all pure functions of the order
  list.
- Customers are not a separate list. The directory is derived from orders,
  matched on mobile number then email.
- Notifications are projected from real orders. The only stored state is which
  references the panel has seen and which it has read.

---

## 7. Data files

| File | Holds |
|---|---|
| `src/data/products.js` | The supplied sheet as rows: serial, name, category |
| `src/data/productRecords.js` | Normalisers and seed generators for products/categories |
| `src/data/packRecords.js` | Combo and gift pack records |
| `src/data/catalog.js` | `buildCatalog` — prices, codes, counts, search |
| `src/data/categoryTones.js` | Per-category colour tones |
| `src/data/siteContent.js` | Editable site copy, identity fields, version stamp |
| `src/data/faq.js`, `testimonials.js` | Static content |
| `src/data/comboGift.js` | Combo tile definitions, retired ids |
| `src/data/imageManifest.json` | Generated artwork map — do not hand-edit |

### Images

`public/images/products/`, `public/images/categories/`,
`public/images/combos/`, `public/images/logo/`, `public/bg/`.

`scripts/image-manifest.mjs` scans those folders and writes the manifest.
Combo photos are numbered (`combos 1.jpeg`…), and the number is the card's
position on the page, so a photo numbered past the last card maps to nothing
rather than being published as a key no component asks for. `CHECKLIST.txt` in
`public/images/` tracks what still needs photography.

---

## 8. Styling

Tailwind with a token ramp defined in `tailwind.config.js`. Component classes
carry legacy token names (`navy`, `ember`, `royal`) that no longer describe
their values — green `#006400` and gold `#D4AF37` are the actual brand
colours. Renaming them would touch every component, so the names stayed and the
values changed.

Two tokens exist specifically for contrast:

- `onGold: '#002b00'` — anything sitting on gold. White on `#D4AF37` is 2.1:1,
  which fails.
- `emberDark` — the old config referenced it on hover but never defined it, so
  no rule was generated and the hover state silently did nothing.

Animation: `fade-rise` (220ms) and `sheet-in` (240ms).

Fonts: Poppins, via a system-ui fallback stack.

---

## 9. Configuration files

| File | Purpose |
|---|---|
| `vite.config.js` | React plugin, port 5173, `/api` dev proxy |
| `tailwind.config.js` | Content globs, colour tokens, shadows, fonts, keyframes |
| `postcss.config.js` | Tailwind + autoprefixer |
| `.eslintrc.cjs` | `eslint:recommended` + react + react-hooks |
| `jsconfig.json` | Bundler resolution, `jsx: react-jsx`, `noEmit` |

---

## 10. Verification checklist

Run before shipping:

```bash
npm run verify
```

That covers lint, typecheck, all five smoke suites and a production build.
Individually:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Manual pass: storefront loads at :5173, `/admin/login` reaches the API,
signing in renders the panel, a catalogue edit shows on the storefront without
a reload, an enquiry becomes an order, and the reports totals agree with the
order list.