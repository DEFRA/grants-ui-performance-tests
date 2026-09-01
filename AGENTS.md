# Repository Guidelines

## Project Overview

A k6 performance test suite for the `grants-ui` platform, covering multiple grant journeys:

- `example-grant-with-auth` — exercises the reusable components shared across all grants
- `woodland` — the Woodland Management Plan (WMP) grant journey

Which journey runs is selected via the `PROFILE` environment variable (see below).

**This repo is the home for all `grants-ui` performance test journeys.** As new grant journeys are built on `grants-ui`, their k6 scenarios are added here as a new `scenarios/<profile>/` folder rather than split out into separate repos — see "Adding a New Journey (Profile)" below.

This suite is run as **standalone load testing** — via the CDP Portal against the Perf-Test environment with a high VU count and configurable duration. It is no longer run as part of the `grants-ui` CI pipeline.

## Project Structure & Module Organization

k6 scenarios live in `scenarios/`, one subfolder per journey (profile), each containing its scenario script and its own `dal-users.csv`. Vendored libraries shared across journeys live in `scenarios/lib/`. HTML reports are generated under `reports/`. Backend data seeding tools live in `data-seeding/`.

Key files:

- `scenarios/example-grant-with-auth/example-grant-with-auth.js` — k6 scenario for the example grant journey with Defra ID authentication
- `scenarios/example-grant-with-auth/dal-users.csv` — CRNs for test users for that journey
- `scenarios/woodland/woodland.js` — k6 scenario for the Woodland Management Plan (WMP) journey with Defra ID authentication
- `scenarios/woodland/dal-users.csv` — CRNs for test users for that journey
- `scenarios/lib/k6chaijs.js` — vendored k6 assertion library, shared across journeys (do not fetch at runtime)
- `entrypoint.sh` — Docker entrypoint; selects the scenario based on `PROFILE`, runs k6, and generates an HTML report published to S3
- `generate-report.sh` — generates an HTML report from the k6 JSON metrics output; journey-agnostic
- `data-seeding/` — standalone Node.js scripts that were used to seed the `grants-ui-backend` MongoDB with background data; historic, would need updating if used again

## Selecting a Journey (`PROFILE`)

`PROFILE` selects which scenario `entrypoint.sh` runs. It is required — there is no default, and `entrypoint.sh` exits immediately with an error if it is unset. CDP sets this in the environment when the test suite is triggered from the Portal; set it locally to run a specific journey.

The profile name maps directly to the scenario path: `scenarios/<profile>/<profile>.js` (lowercased). This is why each journey's folder and script share the same name as its profile.

| `PROFILE` | Scenario |
|---|---|
| `example-grant-with-auth` | `scenarios/example-grant-with-auth/example-grant-with-auth.js` |
| `woodland` | `scenarios/woodland/woodland.js` |

## Test Scenario Structure

Each scenario walks a virtual user through its full grant journey:

1. Login with a CRN from its `dal-users.csv` (password `x`), select first organisation if the `/organisations` page appears
2. Click "Clear application state" to reset prior state
3. Walk each journey page in order, submitting the form and recording a `duration_<page>` Trend metric
4. Assert the confirmation page contains a reference number (`EGWA-` for example-grant-with-auth, `WMP-` for woodland)

Each page has a corresponding p95 threshold enforced via `P95_THRESHOLD_MS` (default 3000ms). HTTP request failures are tolerated up to `HTTP_FAIL_RATE_THRESHOLD` (default 0.01, i.e. 1%) rather than failing the run on a single bad response.

**The focus is individual interaction response times, not overall journey duration.** Every interaction in the journey — including terminal/dead-end pages — is visited and measured. Terminal pages are reached by submitting the triggering value, then the test navigates back to the previous page and resubmits with the happy-path value to continue the journey.

Each `group()` typically times a POST (form submission) followed by the 302 redirect and the subsequent GET — that request/redirect/render cycle is how the journey progresses from one page to the next, and the recorded `duration_<page>` Trend covers the full cycle, not just the POST.

The `example-grant-with-auth` journey's page order and branching are defined by config, not by `grants-ui` code — the source of truth is `configurations/example-grant-with-auth/grants-ui/example-grant-with-auth.yaml` in the `grants-config-example-grants` repo. The `woodland` journey's source of truth is `src/server/common/forms/definitions/woodland.yaml` in `grants-ui`. Each scenario should mirror its config as closely as possible.

## User Data

Each journey's `dal-users.csv` contains CRNs only (no SBIs). The first SBI is selected dynamically from the page if the organisations screen appears. The filename `dal-users.csv` is significant — do not rename it.

The users in these files must exist in both of the following systems, which is why a specific curated set is needed per journey rather than arbitrary test CRNs:

- **DAL stub** — provides land parcel data in Perf-Test; required because both journeys include a land-parcel-selection page that depends on DAL data for the authenticated user
- **Defra ID stub (Perf-Test)** — used to authenticate in the Perf-Test environment

The two journeys' `dal-users.csv` files are independent — a CRN valid for one journey's DAL data is not necessarily valid for the other's.

## Build, Test, and Development Commands

- `PROFILE=example-grant-with-auth bash run-perf-test.sh`: build and run standalone locally against Perf-Test-style defaults (`run-perf-test.sh` builds the Docker image itself). `PROFILE` is required; use `woodland` to run that journey instead.
- `npm --prefix data-seeding install`: install data-seeding dependencies.
- `npm --prefix data-seeding test`: run data-seeding tests when present.

No Node.js or k6 installation needed — only Docker. On Windows, run via Git Bash with `MSYS_NO_PATHCONV=1` prefixed to the `docker run` command to avoid path mangling. Reports are written to `./reports/`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROFILE` | _none — required_ | Selects which journey's scenario to run (`example-grant-with-auth` or `woodland`); CDP sets this per test suite configuration; the suite exits immediately if unset |
| `HOST_URL` | `https://grants-ui.perf-test.cdp-int.defra.cloud` | Target grants-ui instance |
| `DURATION_SECONDS` | `180` | Total test duration |
| `RAMPUP_SECONDS` | `30` | Ramp-up period |
| `VU_COUNT` | `100` | Concurrent virtual users |
| `P95_THRESHOLD_MS` | `3000` | p95 response time threshold (ms) |
| `HTTP_FAIL_RATE_THRESHOLD` | `0.01` | Max allowed HTTP request failure rate (e.g. `0.01` = 1%) |

## Adding New Journey Pages

When a new page is added to a journey:

1. Add a `Trend` constant at the top of that journey's scenario file
2. Add the corresponding threshold in `options.thresholds`
3. Add a `group()` block in the correct position in the journey, recording the trend and submitting the form with the correct field names (check the actual form payload by inspecting the page source or network tab)

## Adding a New Journey (Profile)

1. Create `scenarios/<profile-name>/<profile-name>.js` and its own `scenarios/<profile-name>/dal-users.csv` — the folder and script must share the profile name, since `entrypoint.sh` derives the path directly from `PROFILE`
2. Import the shared assertion lib as `../lib/k6chaijs.js`
3. Document the new profile in the `PROFILE` table above and in `README.md`

## Coding Style & Naming Conventions

Keep scenario filenames named after the journey under load, in a folder of the same name under `scenarios/`. Use explicit environment variable names for tunable load settings and keep vendored k6 libraries shared across journeys under `scenarios/lib/`.

## Vendored Libraries

Third-party k6 libraries live in `scenarios/lib/` and are checked in — they are not fetched at runtime. To update:

```bash
curl -fsSL --ssl-no-revoke https://jslib.k6.io/k6chaijs/<version>/index.js -o scenarios/lib/k6chaijs.js
```

## Domain Language

Use `CONTEXT.md` as the source of truth for grants performance testing language. Prefer those terms in scenarios, reports, docs, and generated changes.

## Developer Addenda

Developers can add their own `AGENTS.local.md` and should be read as an addendum to this file. Keep that file local to your machine and do not commit it.

## Testing Guidelines

Run short-duration local tests before longer load runs. Preserve reference-number assertions and per-page duration metrics when changing journey scripts.
