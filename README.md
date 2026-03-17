# plywood-trino-requester

A [Trino](https://trino.io/) requester for [Plywood](https://github.com/implydata/plywood), enabling [Turnilo](https://github.com/allegro/turnilo) to query Trino as a first-class data source alongside Druid.

This project has two parts:

1. **Requester package** (`src/trinoRequester.ts`) — standalone npm module that sends SQL to Trino's `/v1/statement` HTTP API and handles paginated responses
2. **Turnilo fork** (`docker/turnilo/turnilo/`) — modified Turnilo with Trino cluster support, a Trino SQL dialect, client-side query caching, and manual query controls

## Installation

```
npm install plywood-trino-requester
```

## Usage

### Standalone requester

```javascript
const { trinoRequesterFactory } = require('plywood-trino-requester');
const toArray = require('stream-to-array');

const trinoRequester = trinoRequesterFactory({
  host: 'my.trino.host:8080',
  catalog: 'tpch',
  schema: 'sf1',
  auth: {
    user: 'trino',
    password: 'trino'
  }
});

const stream = trinoRequester({
  query: 'SELECT "nation", sum("price") AS "TotalPrice" FROM "orders" GROUP BY "nation";'
});

toArray(stream)
  .then(results => console.log("Results:", results))
  .catch(err => console.error("Query error:", err));
```

### With Turnilo

The Turnilo fork adds Trino as a cluster type. Configure in `config.yaml`:

```yaml
clusters:
  - name: my_trino
    type: trino
    url: https://trino.example.com
    catalog: my_catalog
    schema: my_schema
    sourceListScan: disable
    timeout: 120000
    auth:
      type: token-command
      command: gcloud auth print-identity-token
      username: user@example.com

dataCubes:
  - name: my_cube
    clusterName: my_trino
    source: my_table
    title: My Table
    timeAttribute: event_time
    introspection: no-autofill
    refreshRule:
      rule: fixed
      time: PT1M
    attributeOverrides:
      - name: event_time
        type: TIME
      - name: country
        type: STRING
      - name: revenue
        type: NUMBER
    dimensions:
      - name: event_time
        kind: time
        formula: $event_time
        title: Event Time
      - name: country
        formula: $country
        title: Country
    measures:
      - name: total_revenue
        formula: $main.sum($revenue)
        title: Total Revenue
```

Key configuration rules:
- Every dataCube **must** have a `timeAttribute` pointing to a `type: TIME` column
- Use `sourceListScan: disable` and `introspection: no-autofill` — auto-discovery crashes without `timeAttribute`
- All columns must appear in `attributeOverrides` with their types
- Auth supports `basic`, `bearer`, and `token-command` (shell command that prints a token)

## Architecture

```
Turnilo React UI
  ├── QueryControlBar ─── Run/Cancel buttons, auto-query toggle
  ├── Ajax.cachedQuery() ─── IndexedDB cache (SHA-256 key, TTL by recency)
  │     └── Ajax.query() ─── axios POST to server
  └── DataProvider ─── debounced query execution, manual mode support
        │
        ▼
Turnilo Server
  └── cluster-manager → requester → trinoRequesterAdapter
        └── HTTP POST to Trino /v1/statement
              └── paginated response handling (nextUri)
        └── TrinoExternal + TrinoDialect → Plywood SQL generation
```

### Trino SQL dialect differences

Turnilo's `TrinoDialect` generates Trino-compatible SQL instead of Postgres:

| Operation | Trino | Postgres |
|-----------|-------|----------|
| Concat | `CONCAT(a, b)` | `a \|\| b` |
| Contains | `STRPOS(h, n) > 0` | `POSITION(n IN h) > 0` |
| Regex | `REGEXP_LIKE(e, p)` | `e ~ 'p'` |
| Time shift | `DATE_ADD('unit', v, ts)` | `ts + INTERVAL ...` |
| Day of week | `DAY_OF_WEEK()` (Mon=1) | `DATE_PART('dow', ...)` (Sun=0) |
| Unix time | `FROM_UNIXTIME()` / `TO_UNIXTIME()` | `TO_TIMESTAMP()` / `EXTRACT(EPOCH ...)` |

### Client-side query cache

All data queries pass through `Ajax.cachedQuery()` which checks IndexedDB before hitting the server:

- **Cache key**: SHA-256 of `{ url, data }` (query endpoint + dataCube + viewDefinition)
- **TTL**: 5 min for queries touching the last 48h, 24h for historical queries, 15 min default
- **Graceful degradation**: cache errors (quota, private browsing) silently fall through to server
- **Inspect**: DevTools > Application > IndexedDB > `turnilo-cache`

### Manual query mode

By default, Turnilo fires queries automatically on every filter/split change (debounced 500ms). The manual mode adds:

- **Auto-query toggle** — checkbox that switches between auto and manual execution
- **Run Query button** — explicitly triggers the query; pulses when the query definition is stale
- **Cancel button** — appears during loading, cancels the pending query
- Preference is persisted in localStorage

## Development

### Prerequisites

- Node.js 16+ (use `nvm use 16` for Turnilo tests)
- Docker & Docker Compose

### Quick start

```bash
# Start Trino (TPC-H) + Turnilo locally
docker compose up --build
# Trino UI: http://localhost:8080
# Turnilo UI: http://localhost:9091
```

TPC-H data covers 1992-1998 — set the time filter to a "Fixed" range in that period, not "Latest".

### With an external Trino cluster

Update `docker/turnilo/config.yaml` with your cluster URL and auth, then:

```bash
docker compose up --build turnilo
```

Auth types supported: `basic` (user/password), `bearer` (static token), `token-command` (shell command that prints a token, e.g. `gcloud auth print-identity-token`).

### Tests

```bash
# Requester unit tests
npm test

# Integration tests (starts Docker, runs tests, stops)
make integration-test

# Turnilo client tests (requires Node 16)
cd docker/turnilo/turnilo
npm run test:client
npm run test:client -- --grep "cache"       # specific tests
npm run test:client -- --grep "QueryControl" # specific tests
```

### Docker build notes

- Base image: `node:18-bullseye` (not `node:16` — Buster repos are EOL)
- Uses `sass` (Dart Sass) instead of `node-sass` — `node-sass` doesn't support arm64 Linux
- `NODE_OPTIONS=--openssl-legacy-provider` is required for Node 18 with the older webpack

### Key files

| File | Purpose |
|------|---------|
| `src/trinoRequester.ts` | Standalone Trino requester (npm package) |
| `docker/turnilo/config.yaml` | Turnilo cluster + dataCube configuration |
| `docker/turnilo/Dockerfile` | Turnilo Docker build |
| `docker/turnilo/turnilo/src/server/utils/trino/trinoDialect.ts` | Trino SQL dialect |
| `docker/turnilo/turnilo/src/server/utils/trino/trinoExternal.ts` | Plywood External (introspection, version) |
| `docker/turnilo/turnilo/src/server/utils/trino/trinoRequesterAdapter.ts` | HTTP requester with auth |
| `docker/turnilo/turnilo/src/client/utils/query-cache/` | IndexedDB query cache |
| `docker/turnilo/turnilo/src/client/utils/ajax/ajax.ts` | `Ajax.cachedQuery()` wrapper |
| `docker/turnilo/turnilo/src/client/components/query-control-bar/` | Run/Cancel UI |
| `docker/turnilo/turnilo/src/client/visualizations/data-provider/data-provider.tsx` | Query execution + manual mode |
| `docker/turnilo/turnilo/src/client/views/cube-view/cube-view.tsx` | Main view, state management |

## Turnilo Fork

The Turnilo fork at `docker/turnilo/turnilo/` is tracked as a separate git repo on branch `feature/trino-support` ([nakulgan/turnilo](https://github.com/nakulgan/turnilo)). Changes there are committed independently from this repo.
