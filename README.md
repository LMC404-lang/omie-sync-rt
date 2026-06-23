# Omie → Supabase Sync

Automated ETL pipeline that extracts data from the **Omie ERP API** and
syncs it to **Supabase** (PostgreSQL) several times a day.

**Every Omie field becomes a typed Postgres column.** No `raw`
columns, no `jsonb`, no `generated` accessors. Arrays of objects
(line items, characteristics, etc.) are pivoted into dedicated
**child tables** linked via foreign keys.

## What gets synced

The pipeline ships with **51 Omie endpoints** wired up out of the box,
grouped into 8 hand-tuned core entities (clients, sales orders,
accounts receivable/payable, service orders, products, CRM
opportunities, CRM activities) and 43 registry-driven lookup /
transactional tables (DRE, categories, departments, vendors, banks,
payment methods, current accounts, financial movements, NF-e, NFS-e,
boletos, PIX, CRM lookups, inventory, purchases, industry-specific
modules, and more).

Each parent table has a typed column for every Omie field it
returns. Wherever Omie embeds an array of objects (sales-order line
items, OS line items, product characteristics, NFe items, financial
movements categorias, stock-movement entries…), that array is
flattened into its **own** child table whose primary key is
`(parent_pk, child_pk)`.

### Core entities (phase 0)

| Entity | Omie endpoint | Parent table | Children |
|---|---|---|---|
| Clients (CRM) | `geral/clientes` | `omie_clients` | `omie_client_tags`, `omie_client_caracteristicas`, `omie_client_contatos` |
| Sales orders | `produtos/pedido` | `omie_orders` | `omie_order_items`, `omie_order_lancamentos` |
| Accounts receivable | `financas/contareceber` | `omie_accounts_receivable` | — |
| Accounts payable | `financas/contapagar` | `omie_accounts_payable` | — |
| Service orders | `servicos/os` | `omie_service_orders` | `omie_service_order_items`, `omie_service_order_parcels` |
| Products | `geral/produtos` | `omie_products` | `omie_product_caract_values`, `omie_product_tags`, `omie_product_images` |
| CRM opportunities | `crm/oportunidades` | `omie_crm_opportunities` | — |
| CRM activities | `crm/tarefas` | `omie_crm_activities` | — |

### Registry-driven tables (`config/omie-tables.js`)

A single declarative config file lists every additional Omie endpoint
to sync. A generic extractor + transformer turns each entry into a
full ETL pipeline at runtime — no per-table code needed.

To list everything the registry knows about:

```bash
npm run tables:list
# or filter:
node scripts/sync-tables.js list --tier critical
node scripts/sync-tables.js list --phase 1
```

Tables are grouped into 4 tiers and 7 phases:

| Tier | Examples |
|---|---|
| `critical` | DRE, categories, departments, projects, document types, units, families, billing/order steps, vendedores, current accounts, financial movements |
| `important` | banks, payment methods, parcelas, CRM phases/status/origens, current account transactions |
| `optional` | buyers, stock locations, price tables, inventory, purchases, NF-e, NFS-e, boletos, PIX, CRM contacts |
| `industry` | product variations / kits / lots / structure, production orders, service contracts, CT-e, NFC-e, tags, custom fields |

By default `OMIE_SYNC_TIERS=critical,important,optional` (Phase 7
industry tables are off — opt in via env). Phase-0 legacy entities
are always on.

## Project structure

```
omie-supabase-sync/
├── src/
│   ├── index.js              # Scheduler entry point
│   ├── sync.js               # Orchestration logic
│   ├── entities.js           # Registry → entity wiring (single source)
│   ├── omieClient.js         # Omie API client (pagination + retry)
│   ├── supabaseClient.js     # Supabase client
│   ├── loader.js             # Batched upsert to Supabase
│   ├── syncLog.js            # Audit log read/write
│   ├── config.js             # Centralised config from env vars
│   ├── logger.js             # Winston logger
│   ├── extractors/           # Bespoke API call wrappers for legacy entities
│   └── transformers/
│       └── generic.js        # Registry-driven flat-record producer
├── scripts/
│   ├── sync-single.js        # CLI: sync one or more named entities
│   ├── sync-tables.js        # CLI: filter / sync registry tables
│   ├── generate-schema.js    # CLI: regenerate config/schema.sql
│   ├── show-logs.js          # CLI: print recent sync logs
│   └── setup-db.js           # CLI: apply schema to Supabase
├── config/
│   ├── omie-tables.js        # Declarative registry (every endpoint + every column + child tables)
│   └── schema.sql            # Full Supabase schema (auto-generated)
├── .github/workflows/
│   └── sync.yml              # GitHub Actions cron schedule
├── .env.example
└── package.json
```

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your Omie and Supabase credentials
```

### 3. Create the Supabase schema

Open your **Supabase SQL Editor** and paste the contents of
`config/schema.sql`, then click **Run**. The file is idempotent
(`create table if not exists` + `add column if not exists`) so it
can also be re-run on an existing database to bring it up to date.

To regenerate `config/schema.sql` after editing
`config/omie-tables.js`:

```bash
npm run db:generate-schema
# then paste the new config/schema.sql into the Supabase SQL Editor
```

### 4. Run a manual sync
```bash
# Sync everything currently active (incremental)
npm run sync:once

# Sync everything (full re-sync, ignores last-sync timestamps)
npm run sync:full

# Sync one or more named entities
node scripts/sync-single.js clients
node scripts/sync-single.js categories units vendedores --full

# Filter / sync the registry-driven tables
npm run tables:list
npm run tables:sync                          # all active (env-driven)
npm run tables:sync:critical                 # tier filter
npm run tables:sync:phase1                   # phase filter
node scripts/sync-tables.js sync --name omie_categories,omie_units --full
```

### 5. Start the scheduler (production)
```bash
npm start
```
This runs incremental syncs every 3 hours and a full sync at 2am.

### 6. View sync logs
```bash
npm run logs
```

## Deployment options

### GitHub Actions (recommended — free)
1. Push to GitHub.
2. Add secrets: `OMIE_APP_KEY`, `OMIE_APP_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
3. The workflow in `.github/workflows/sync.yml` runs automatically on the cron schedule.

### Railway / Render (always-on)
- Set env vars in the dashboard and run `npm start`.

### Docker
```bash
docker build -t omie-sync .
docker run --env-file .env omie-sync
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `OMIE_APP_KEY` | Omie app key | required |
| `OMIE_APP_SECRET` | Omie app secret | required |
| `SUPABASE_URL` | Supabase project URL | required |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | required |
| `SYNC_INTERVAL_HOURS` | Incremental sync frequency | `3` |
| `FULL_SYNC_CRON` | Cron for daily full sync | `0 2 * * *` |
| `BATCH_SIZE` | Supabase upsert batch size | `200` |
| `OMIE_PAGE_SIZE` | Records per Omie API page | `50` |
| `OMIE_REQUEST_DELAY_MS` | Delay between API pages (ms) | `300` |
| `OMIE_SYNC_TIERS` | Active registry tiers (`critical,important,optional,industry,all`) | `critical,important,optional` |
| `LOG_LEVEL` | debug / info / warn / error | `info` |

## How it works

1. **Incremental sync** — reads the `finished_at` of the last
   successful run from `sync_log` and passes it to the Omie API as
   `filtrar_por_data_de` (or the per-entry `sinceDateField` declared
   in the registry, e.g. `dEmiInicial` for NF-e). Only changed records
   are fetched.
2. **Full sync** — ignores last-sync timestamp; re-fetches every page.
3. **Type-safe transform** — for every record the generic transformer
   walks the registry's `columns[]` definition and extracts each
   field directly into its typed Postgres column. Numbers, dates,
   booleans (Omie's `'S'/'N'`), and `bigint` IDs are converted in
   one pass.
4. **Child tables** — every entry can declare `children[]`, each
   pointing at an array property on the source record. Those arrays
   are pivoted into a dedicated child table with a `(parent_pk,
   child_pk)` composite primary key and a `foreign key … on delete
   cascade` back to the parent.
5. **Upsert** — every write uses `ON CONFLICT (pk) DO UPDATE`, so
   re-running is always safe. Child upserts use the composite key.
6. **No raw / no jsonb** — every Omie field is mapped explicitly,
   nothing is stored as opaque JSON. Postgres can index / join /
   filter on every value.

## Adding or correcting an Omie endpoint

Edit `config/omie-tables.js` only — no other code changes required:

1. Add a new entry (or edit an existing one).
2. List every Omie field you care about under `columns:`.
3. List every array property you want pivoted under `children:`.
4. Run `npm run db:generate-schema` and paste the regenerated
   `config/schema.sql` into Supabase.
5. The entity is picked up automatically on the next sync.

The most common per-entry overrides are `endpoint`, `action`,
`listKey`, `idFields`, and (for incremental sync)
`sinceDateField` / `sinceEndDateField`.
