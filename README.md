# grants-ui-performance-tests

## Overview

Performance test suite for Defra's [grants-ui](https://github.com/DEFRA/grants-ui) application, maintained by the Grants-UI team. This repo is the home for all `grants-ui` performance test journeys. As new grant journeys are built on `grants-ui`, their k6 scenarios are added here — see [Adding a New Journey](#adding-a-new-journey) — rather than split out into separate repos as previously.

## Test Coverage

The suite provides performance testing for multiple grant journeys, with which journey being run determined by the `PROFILE` environment variable.

## Technology Stack

- **Grafana k6** for load testing and performance measurement.

## Test Scenarios

Individual test scripts are located under the `/scenarios` directory, one subfolder per journey (profile), with each script targeting a specific grant application journey.

Current test scenarios:
- `example-grant-with-auth/example-grant-with-auth.js` - Example grant application journey (`PROFILE=example-grant-with-auth`)
- `woodland/woodland.js` - Woodland Management Plan (WMP) grant application journey (`PROFILE=woodland`)

## Configuration

Test scenarios are parameterized via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PROFILE` | _none — required_ | Selects which journey's scenario to run (`example-grant-with-auth` or `woodland`); the suite exits immediately if unset |
| `HOST_URL` | `https://grants-ui.perf-test.cdp-int.defra.cloud` | Base URL of the grants-ui instance under test |
| `DURATION_SECONDS` | `180` | Total test duration in seconds |
| `RAMPUP_SECONDS` | `30` | Time to ramp up to target VU count |
| `VU_COUNT` | `100` | Number of concurrent virtual users |
| `P95_THRESHOLD_MS` | `3000` | 95th percentile response time threshold in milliseconds |

## Test Assertions

Each test scenario includes:

**Reference Number Assertion:**
- Validates the confirmation page contains a valid reference number, indicating successful end-to-end submission to GAS

**Page Load Metrics:**
- Each journey page records its load time as a `duration_<page>` Trend metric (e.g. `duration_start`, `duration_yes_no_field`). These are used for per-page p95 thresholds and reported in the HTML report as page load times sorted by p95 descending.

### Thresholds

The test enforces the following thresholds:
- Per-page p(95) < `P95_THRESHOLD_MS`ms - 95th percentile page load time for each journey page must be under the configured threshold (default 3000ms). Each journey page has its own `duration_<page>` Trend metric.
- `http_req_failed` rate == 0 - no HTTP request failures are permitted

## Running Tests

### Via CDP Portal

Tests are executed from the CDP Portal under the **Test Suites** section against the **Perf-Test** environment.

**Execution:**
1. Navigate to Test Suites in the CDP Portal
2. Select a profile and override any environment variables using secrets
3. Execute the test
4. View reports in the portal once the test completes

**Reports:**
- HTML reports are generated and published to S3
- Accessible through the CDP Portal interface

### Running Locally against Perf-Test

**Prerequisites:**
- Docker

**Run standalone (via `run-perf-test.sh`):**

`PROFILE` is required — the suite exits immediately if it isn't set:
```bash
PROFILE=example-grant-with-auth bash run-perf-test.sh
# or
PROFILE=woodland ./run-perf-test.sh
```

Reports are written to the `./reports` directory.

## Project Structure

```
grants-ui-performance-tests/
├── scenarios/                          # k6 test scenarios, one folder per journey (profile)
│   ├── lib/                            # Vendored third-party k6 libraries, shared across journeys
│   ├── example-grant-with-auth/
│   │   ├── example-grant-with-auth.js
│   │   └── dal-users.csv               # User data (CRNs) for this journey
│   └── woodland/
│       ├── woodland.js
│       └── dal-users.csv               # User data (CRNs) for this journey
├── reports/               # Generated test reports (gitignored)
├── data-seeding/          # Tools for seeding backend test data
├── Dockerfile             # Container image definition
├── entrypoint.sh          # Test execution script; selects the scenario via PROFILE
├── generate-report.sh     # HTML report generation script
├── run-perf-test.sh       # Build and run standalone locally against Perf-Test-style defaults
└── README.md
```

## Adding a New Journey

When a new grant journey goes live on `grants-ui`, add its k6 scenario to this repo rather than creating a new performance test repo:

1. Create `scenarios/<profile-name>/<profile-name>.js` and its own `scenarios/<profile-name>/dal-users.csv`. The folder and script must share the profile name, since `entrypoint.sh` derives the scenario path directly from `PROFILE` (`scenarios/<profile>/<profile>.js`, lowercased).
2. Import the shared assertion lib as `../lib/k6chaijs.js`.
3. Add the new journey to the "Current test scenarios" list and the `PROFILE` row in [Configuration](#configuration) above, and to the equivalent tables in `AGENTS.md`.

## Dependencies

Third-party k6 libraries are vendored into `scenarios/lib/` rather than fetched at runtime, to avoid network dependencies during test execution.

| File | Source | Version |
|------|--------|---------|
| `scenarios/lib/k6chaijs.js` | https://jslib.k6.io/k6chaijs/4.3.4.3/index.js | 4.3.4.3 |

To update a library, download the new version and replace the file:
```bash
curl -fsSL --ssl-no-revoke https://jslib.k6.io/k6chaijs/<new-version>/index.js -o scenarios/lib/k6chaijs.js
```

Then update the version in the table above.

## Test Data

Each journey's `dal-users.csv` file contains Customer Reference Numbers (CRNs) for test users. These users are sourced from the DAL (Data Access Layer) and match users available in the **Perf-Test** environment. The two journeys' user sets are independent — a CRN valid for one is not necessarily valid for the other.

**Format:**
```csv
crn
1102838829
1103623923
...
```

## Data Seeding

We have previously seeded the `grants-ui-backend` MongoDB database with several years of background data to replicate querying over a large dataset for PRR purposes. The [data-seeding](data-seeding/README.md) directory contains historic scripts to generate JSONL files that can be embedded in a `grants-ui-backend` hot fix release for direct MongoDB import. These will need updating of used again.

## Related Repositories

- [grants-ui](https://github.com/DEFRA/grants-ui) - Grants application frontend service
- [grants-ui-backend](https://github.com/DEFRA/grants-ui-backend) - Backend service, included in the scope of these tests
- [fcp-defra-id-stub](https://github.com/DEFRA/fcp-defra-id-stub) - Authentication stub used for testing as opposed to the real Defra ID

## Support

For questions or issues, contact the Grants-UI team.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
