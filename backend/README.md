# Crackers Shop — Backend & Database

Node.js + Express + Mongoose API for the Anish Enterprises crackers shop.
The React storefront talks to this over `/api`.

---

## 1. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 20 |
| MongoDB | 7.x+ local, or MongoDB Atlas |

---

## 2. MongoDB setup

### Option A — local standalone (quickest)

```bash
mongod --dbpath ./data
```

Standalone `mongod` **cannot run multi-document transactions**. The app detects
this at startup and automatically switches stock reservation to guarded atomic
`$inc` updates, so ordering still works correctly. `/api/health` reports which
mode is active under `data.transactions`.

### Option B — local replica set (recommended, enables transactions)

```bash
mongod --replSet rs0 --dbpath ./data
# then, once, in another shell:
mongosh --eval "rs.initiate()"
```

Restart `mongod` after `rs.initiate()`. `/api/health` will then report
`"transactions": "available"`.

### Option C — MongoDB Atlas

Create a free M0 cluster, add your IP to the access list, and copy the SRV
string. Atlas is a replica set, so transactions are available.

---

## 3. Environment

```bash
cd backend
cp .env.example .env
```

Then set at minimum:

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Connection string, database name included |
| `JWT_SECRET` | >= 32 chars. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SEED_ADMIN_PASSWORD` | Only read by `npm run seed:admin`. >= 10 chars. |
| `PORT` | Defaults to `5000` |

`IMPORT_SELLING_PRICE_COLUMN` and `IMPORT_ORIGINAL_PRICE_COLUMN` are
**intentionally blank**. See section 7.

The connection is read once in `src/config/env.js` and validated with Zod, so a
missing or malformed variable fails at boot with the variable *name* only —
never a secret value.

---

## 4. Install, seed, run

```bash
npm install
npm run seed:admin     # creates the owner login + the shop settings singleton
npm run dev            # http://localhost:5000
```

Verify:

```bash
curl http://localhost:5000/api/health
# {"success":true,"data":{"service":"anish-enterprises-api", ... "database":{"connected":true}}}
```

Sign in at `POST /api/auth/login` with `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`. The seeded account is `owner`, which holds every
permission. There is no public admin registration.

`seed:admin` is safe to re-run: an existing account keeps its password unless
you pass `--reset-password`.

---

## 5. Collections

Created automatically on first connection (`autoIndex` is on outside
production). All use `timestamps`, so `createdAt` / `updatedAt` are maintained
by Mongoose.

| Collection | Model | Purpose |
|---|---|---|
| `admins` | `src/models/Admin.js` | Staff logins. bcrypt hash only, `select: false` |
| `products` | `src/models/Product.js` | Catalogue, pricing, stock |
| `categories` | `src/models/Category.js` | Catalogue groupings |
| `customers` | `src/models/Customer.js` | Enquiry-based buyers, keyed by phone |
| `carts` | `src/models/Cart.js` | Server-side carts, guest token + optional customer |
| `orders` | `src/models/Order.js` | Placed orders with immutable price snapshots |
| `settings` | `src/models/Settings.js` | Single-document shop profile |
| `importlogs` | `src/models/ImportLog.js` | Every import batch and its row results |

### Relationships

```
Category 1 ──< Product        (categoryRef: ObjectId, plus a denormalised `category` string)
Customer 1 ──< Order          (customer: ObjectId, plus an immutable `customerSnapshot`)
Customer 1 ──< Cart           (customer: ObjectId)
Cart      1 ──< CartItem >── 1 Product   (items.product: ObjectId, re-priced from the live doc)
Order     1 ──< OrderItem >── 1 Product  (items.product: ObjectId + name/code/sku/price snapshots)
ImportLog 1 ──< Product       (importBatchId: ObjectId, stamped after commit)
Admin     1 ──< *             (createdBy / performedBy / history.by)
```

Two deliberate design points:

- **Orders never re-read the catalogue.** `orderItemSchema` stores `name`,
  `code`, `sku`, `category`, `packSize`, `unitPrice` and `mrp` as they were at
  purchase time, so a later rename or reprice cannot rewrite history.
- **Carts are always re-priced from the live product document.** The snapshot
  fields on a cart item are display-only.

### Field names that differ from the original spec

| Spec name | Implemented as | Why |
|---|---|---|
| `originalPrice` | `mrp` | MRP is what the sheet carries; shown as savings |
| `stockQuantity` | `stock` | `null` = not tracked, deliberately distinct from `0` |
| `isAvailable` | `status` + `isPublished` + `isAvailable()` method | Publishing and stock are separate concerns |
| `unit` / `packSize` | `packSize`, `packQuantity`, `packUnit` | "2 bag" becomes 2 x Bag |
| `orderNumber` | `reference` | e.g. `AE-20260927-4F2A` |
| `customerId` / `customerDetails` | `customer` + `customerSnapshot` | Survives a later customer edit |
| `subtotal` / `totalAmount` | `itemsTotal` / `total` | `total` is derived in `pricing.service.js` only |
| `deliverySettings` / `paymentSettings` / `pricingSettings` | `delivery` / `payments` / `payments.pricing` | Grouped under the settings singleton |

---

## 6. Validation and indexes

Validation lives in the schema (`required`, `min`, `maxlength`, `enum`) and in
Zod schemas under `src/validators/` for every request body and query string.

Live indexes (verified against the running database):

| Collection | Indexes |
|---|---|
| `admins` | `email` unique, `role`, `isActive` |
| `products` | `code` unique (partial), `sku` unique (partial), `sourceSerial` unique (partial), `name` text + compound text, `category`, `categoryRef`, `status`, `isPublished`, `isFeatured`, `source`, `importBatchId`, `{status, isPublished, category}` |
| `categories` | `name` unique, `slug` unique, `order`, `isActive` |
| `customers` | `phone` unique, `email`, `name` |
| `carts` | `token` unique, `customer`, `items.product`, `lastActivityAt` |
| `orders` | `reference` unique, `customer`, `status`, `paymentStatus`, `{status, createdAt:-1}`, `{paymentStatus, createdAt:-1}`, `{'customerSnapshot.phone', createdAt:-1}`, `{createdAt:-1}` |
| `settings` | `key` unique |
| `importlogs` | `fileHash`, `status`, `performedBy`, `{fileHash, status}` unique **partial on `status: 'committed'`** |

Notes:

- The SKU / code / `sourceSerial` indexes are **partial**, so many products may
  legitimately have no code while a repeated one is still rejected.
- Prices are `min: 0` and rounded by `roundMoney`; a product's `mrp` is never
  allowed below its `sellingPrice` (that would render as negative savings).
- `stock` is `min: 0` and integer-coerced; `quantity` is `min: 1` with a
  `MAX_CART_QUANTITY` ceiling.
- `sanitizeFilter` is on, so query values that carry Mongo operators are
  neutralised before they reach a query.

---

## 7. Excel import

`Order Crackers 2026.xlsx` is read by `src/services/excel.service.js` and
written by `src/services/import.service.js`. Both the admin UI and the CLI call
the same two functions, so they cannot drift apart.

### The selling-price column is never guessed

The workbook carries several price-like columns. Until the shop owner confirms
which one is the **customer-facing** price, `analyseWorkbook` reports it as
unmapped, every row is marked invalid, `readyToImport` is `false`, and both
`previewImport` and `commitImport` refuse to write. Confirming the mapping in
the admin UI stores it in `settings.importPriceMapping` (with who confirmed it
and when); `--selling-price-column` supplies it for a single run.

Original product names and category headings are preserved **exactly** as they
appear in the sheet. A presentation-only corrected label is stored separately
in `category.label`.

Category heading rows are detected (text in the leading columns, nothing after)
and classified as `category`, never as products. Blank rows are skipped. Stock
is left `null` rather than invented, because the sheet has no reliable count.
Re-importing the same file is refused on its SHA-256 (`duplicate_import`), and
a committed batch is additionally protected by the unique partial index.

### CLI

```bash
# 1. Preview - writes nothing, reports what it found
npm run import:catalog -- "Order Crackers 2026.xlsx"

# 2. Commit, confirming the price columns
npm run import:catalog -- "Order Crackers 2026.xlsx" --commit \
  --selling-price-column "NET RATE" --original-price-column "MRP"
```

Options: `--sheet <name>`, `--no-update` (skip existing products instead of
updating), `--admin <email>` (stamp the batch with an admin).

Both steps print a summary: total rows, product rows, category rows skipped,
blank rows skipped, valid, invalid, created, updated, skipped, failed, plus the
first few failed rows with reasons.

### Admin UI / API

| Endpoint | Purpose |
|---|---|
| `GET  /api/admin/products/import/mapping` | Whether the price mapping is confirmed |
| `POST /api/admin/products/import/preview` | Parse and report, no writes |
| `POST /api/admin/products/import/commit` | Write the accepted rows |
| `GET  /api/admin/products/import/history` | Past batches and their summaries |

All require an authenticated admin holding `imports:run`. The workbook is
parsed from memory and never written to disk.

---

## 8. Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start with `node --watch` |
| `npm start` | Start normally |
| `npm run seed:admin` | Create/reset the first owner account |
| `npm run import:catalog` | Workbook preview/commit (section 7) |
| `npm run db:reset` | Clear catalogue data. Refuses in production and without `--confirm`; keeps admins and settings. Add `--include-orders` to also wipe orders, customers and carts |
| `npm test` | `node --test` — schema, index and validation tests. No database needed |
| `npm run verify` | Alias for `npm test` |
| `node scripts/check-imports.mjs` | Every named import resolves |
| `node scripts/check-contracts.mjs` | Model/constant/service contracts hold |

---

## 9. Transactions

`placeOrder` starts a session and wraps stock reservation, order creation and
the customer counters in `withTransaction` **when the deployment supports it**.
When it does not (standalone `mongod`), `mongoCapabilities()` reports
`supportsTransactions: false` and the order service falls back to guarded
atomic `$inc` updates with compensating rollbacks, so a partially applied
stock decrement is still repaired. `/api/health` exposes the active mode under
`data.transactions`.

---

## 10. Shutdown

`SIGINT` / `SIGTERM` stop accepting connections, close the Mongo connection and
exit `0`, with a 10-second forced-exit backstop. A second signal is ignored
rather than draining twice. Startup also refuses to run if the port is already
serving another instance of this API, and reports which one it found.
