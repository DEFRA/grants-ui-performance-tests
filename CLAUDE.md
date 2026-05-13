# CLAUDE.md

## Project overview

A k6 performance test suite for the `grants-ui` platform, covering the `example-grant-with-auth` journey. This journey exercises the reusable components shared across all grants. Other grants have their own dedicated performance test suites.

This suite serves two purposes:
- **Standalone load testing** — run via the CDP Portal against the Perf-Test environment with a high VU count and configurable duration
- **grants-ui CI pipeline** — the image is run as part of the `grants-ui` pipeline with a small number of users and a benchmark p95 threshold to catch regressions on every merge

## Key files

- `scenarios/example-grant-with-auth.js` — the single k6 test scenario, covering the full example grant journey with Defra ID authentication
- `scenarios/dal-users.csv` — CRNs for test users sourced from the DAL; used to drive virtual users through authentication
- `scenarios/lib/k6chaijs.js` — vendored k6 assertion library (do not fetch at runtime)
- `entrypoint.sh` — Docker entrypoint; runs k6 and optionally generates an HTML report published to S3
- `generate-report.sh` — generates an HTML report from the k6 JSON metrics output
- `data-seeding/` — standalone Node.js scripts for seeding the `grants-ui-backend` MongoDB with background data

## Test scenario structure

The scenario (`example-grant-with-auth.js`) walks a virtual user through the full grant journey:

1. Login with CRN from `dal-users.csv` (password `x`), select first organisation if the `/organisations` page appears
2. Click "Clear application state" to reset prior state
3. Walk each journey page in order, submitting the form and recording a `duration_<page>` Trend metric
4. Assert the confirmation page contains a reference number (`EGWA-`)

Each page has a corresponding p95 threshold enforced via `P95_THRESHOLD_MS` (default 3000ms).

**The focus is individual page response times, not overall journey duration.** Every page in the journey — including terminal/dead-end pages — is visited and measured. Terminal pages are reached by submitting the triggering value, then the test navigates back to the previous page and resubmits with the happy-path value to continue the journey. The journey should mirror `reusable-components.feature` in `grants-ui` as closely as possible.

## User data

`dal-users.csv` contains CRNs only (no SBIs). The first SBI is selected dynamically from the page if the organisations screen appears. The filename `dal-users.csv` is significant — do not rename it.

The users in this file must exist in all three of the following systems, which is why a specific curated set is needed rather than arbitrary test CRNs:

- **Defra ID stub (CI)** — used to authenticate into grants-ui in the grants-ui CI pipeline
- **DAL stub** — provides land parcel data in both CI and Perf-Test (same data in both environments); required because the journey includes a `select-land-parcel` page that depends on DAL data for the authenticated user
- **Defra ID stub (Perf-Test)** — used to authenticate in the Perf-Test environment

## Running locally

Requires Docker. No Node.js or k6 installation needed.

```bash
# Build
docker build -t grants-ui-performance-tests .

# Run (Git Bash on Windows)
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)/reports:/reports" grants-ui-performance-tests

# Run (Linux/Mac)
docker run --rm -v "$(pwd)/reports:/reports" grants-ui-performance-tests
```

Reports are written to `./reports/`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST_URL` | `https://grants-ui.perf-test.cdp-int.defra.cloud` | Target grants-ui instance |
| `DURATION_SECONDS` | `180` | Total test duration |
| `RAMPUP_SECONDS` | `30` | Ramp-up period |
| `VU_COUNT` | `100` | Concurrent virtual users |
| `P95_THRESHOLD_MS` | `3000` | p95 response time threshold (ms) |
| `GENERATE_REPORT` | `true` | Set to `true` in the CDP Portal environment to generate and publish an HTML report to S3; not used in the CI pipeline |

## Adding new journey pages

When a new page is added to the `example-grant-with-auth` journey:

1. Add a `Trend` constant at the top of the scenario file
2. Add the corresponding threshold in `options.thresholds`
3. Add a `group()` block in the correct position in the journey, recording the trend and submitting the form with the correct field names (check the actual form payload by inspecting the page source or network tab)

## Vendored libraries

Third-party k6 libraries live in `scenarios/lib/` and are checked in — they are not fetched at runtime. To update:

```bash
curl -fsSL --ssl-no-revoke https://jslib.k6.io/k6chaijs/<version>/index.js -o scenarios/lib/k6chaijs.js
```
