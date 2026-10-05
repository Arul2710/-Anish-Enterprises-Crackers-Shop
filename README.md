# Anish Enterprises — Crackers Shop

Enquiry-based storefront and admin panel for a wholesale crackers outlet in
Sivakasi. Two apps in one repository:

| Folder | What it is | Stack | Runs on |
|---|---|---|---|
| `frontend/` | Storefront + admin panel | React 18, Vite 6, Tailwind 3, React Router 6 | http://localhost:5173 |
| `backend/` | REST API + database | Node 20+, Express 4, Mongoose 8, Zod, JWT | http://localhost:5000 |

Detailed docs: [`frontend/README.md`](frontend/README.md) ·
[`backend/README.md`](backend/README.md)

---

## 1. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 20 |
| npm | >= 10 |
| MongoDB | 7.x+ local, or MongoDB Atlas |

---

## 2. Quick start

Two terminals.

**Terminal 1 — API**

```bash
cd backend
npm install
cp .env.example .env      # then edit MONGODB_URI / JWT_SECRET
npm run seed:admin        # creates the owner login + the settings singleton
npm run dev
```

**Terminal 2 — Storefront**

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. The admin panel is at
http://localhost:5173/admin/login — sign in with the `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` from `backend/.env`.

Verify the API is up:

```bash
curl http://localhost:5000/api/health
```

---

## 3. MongoDB

Transactions need a replica set. Without one the API still works — it detects
the limitation at boot and falls back to guarded atomic stock updates.

```bash
# Transactions available (recommended)
mongod --replSet rs0 --dbpath ./data
mongosh --eval "rs.initiate()"

# No transactions, still functional
mongod --dbpath ./data
```

`/api/health` reports the active mode under `data.transactions`. Atlas is a
replica set, so a free M0 cluster works with no setup.

---

## 4. How the two apps talk

```
Browser ──► frontend (Vite, :5173)
              │  /api/*  → proxied in dev to the API
              ▼
           backend (Express, :5000) ──► MongoDB
```

- In dev the Vite proxy on `vite.config.js` forwards `/api` to the API, so the
  browser makes same-origin calls and the session cookie works without CORS.
- Set `VITE_API_URL` in `frontend/.env` to point elsewhere (a deployed API, or
  a direct `http://localhost:5000` during debugging).

---

## 5. Data ownership

The backend is the source of truth. Product, category, order and customer
records live in MongoDB and are edited through the API; the frontend renders
whatever the API returns.

The frontend keeps browser-local state for two things only:

- **Admin session cache** — who was last signed in, so a reload can paint the
  panel before `/api/auth/me` answers. Credentials are never stored; the
  session is an HttpOnly cookie.
- **Unsynced client records** — products/categories/packs and orders still fall
  back to `localStorage` keys (`spark-shine-*`) when the API is unreachable,
  which keeps the panel usable offline. An admin edit made in that state is
  local to that browser until the API is reachable again.

---

## 6. Common tasks

```bash
# Backend
cd backend
npm run dev                      # watch mode
npm test                         # node --test, no database needed
npm run import:catalog -- "Order Crackers 2026.xlsx" --commit \
  --selling-price-column "NET RATE" --original-price-column "MRP"
npm run db:reset -- --confirm    # clear catalogue data

# Frontend
cd frontend
npm run dev
npm run lint
npm run typecheck
npm test                         # smoke tests, no browser needed
npm run verify                   # lint + typecheck + test + build
npm run build
```

---

## 7. Repository layout

```
crackers/
├── backend/
│   ├── src/
│   │   ├── config/       env validation, db connection, constants
│   │   ├── models/       Mongoose schemas
│   │   ├── routes/       /api route table
│   │   ├── controllers/  request handlers
│   │   ├── services/     business logic, pricing, excel, import
│   │   ├── middleware/   auth, rate limits, upload, validation
│   │   ├── validators/   Zod request schemas
│   │   ├── scripts/      seedAdmin, importCatalog, resetDatabase
│   │   └── utils/
│   ├── scripts/          check-imports.mjs, check-contracts.mjs
│   └── tests/            node:test suites
└── frontend/
    ├── src/
    │   ├── pages/        storefront screens
    │   ├── admin/        admin screens + AdminLayout shell
    │   ├── components/   shared UI, catalog/ sub-components
    │   ├── context/      Content, Catalog, Cart providers
    │   ├── hooks/        useCatalog, useCart, useAdminAuth, useSeo, ...
    │   ├── services/     api client + auth/orders/notifications/enquiries
    │   ├── data/         catalog seed, site content, FAQ, testimonials
    │   └── utils/        storage, format, images, documents
    ├── public/           images/, bg/, favicons
    └── scripts/          image manifest + smoke tests
```

---

## 8. Before deploying

- `NODE_ENV=production`, a real `MONGODB_URI`, and a fresh 32+ char `JWT_SECRET`.
- `SECURE_COOKIES=true` once the API is served over HTTPS; set `COOKIE_DOMAIN`
  and `TRUST_PROXY=1` if it sits behind a reverse proxy.
- `CLIENT_ORIGINS` must list the real storefront origin.
- `SEED_ADMIN_PASSWORD` is read only by `npm run seed:admin` — unset it after the
  first run.
- Frontend: build with `npm run build`, serve `dist/` from any static host.