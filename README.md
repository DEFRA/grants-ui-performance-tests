# grants-ui-performance-tests

## Overview

Performance test suite for Defra's [grants-ui](https://github.com/DEFRA/grants-ui) platform, maintained by the Grants Application Enablement (GAE) team.

## Test Coverage

The suite provides performance testing for a generic example grant journey using reusable `grants-ui` components.

## Technology Stack

- **Grafana k6** for load testing and performance measurement

## Test Scenarios

Individual test scripts are located in the `/scenarios` directory, with each script targeting a specific grant application journey.

Current test scenarios:
- `example-grant-with-auth.js` - Example grant application journey with Defra ID authentication

## Configuration

Test scenarios are parameterized via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DURATION_SECONDS` | `180` | Total test duration in seconds |
| `RAMPUP_SECONDS` | `30` | Time to ramp up to target VU count |
| `VU_COUNT` | `100` | Number of concurrent virtual users |
| `P95_THRESHOLD_MS` | `3000` | 95th percentile response time threshold in milliseconds |

## Test Assertions

Each test scenario includes:

**Response Status Code Assertion:**
- Validates all responses return HTTP 200 success
- The test follows redirects automatically (302s are handled transparently) and only validates the final response code

**Reference Number Assertion:**
- Validates all submissions return a response containing a valid reference number to indicate successful submission to GAS

### Thresholds

The test enforces performance thresholds:
- `journey_http_req_duration` p(95) < `P95_THRESHOLD_MS`ms - 95th percentile response time for journey pages must be under the configured threshold (default 3000ms)

Note: The `journey_http_req_duration` metric only includes actual journey pages (start through confirmation), excluding initial navigation, login and cleardown steps.

## Running Tests

### Via CDP Portal

Tests are executed from the CDP Portal under the **Test Suites** section for the **Perf-Test** environment.

**Execution:**
1. Navigate to Test Suites in the CDP Portal
2. Configure the test via environment variables the if defaults need to be overridden
3. Execute the test
4. View reports in the portal once the test completes

**Reports:**
- HTML reports are generated and published to S3
- Accessible through the CDP Portal interface

### Running Locally

**Prerequisites:**
- Docker

**Build:**
```bash
docker build -t grants-ui-performance-tests .
```

**Run with defaults:**
```bash
# Git Bash on Windows
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)/reports:/reports" grants-ui-performance-tests

# Linux/Mac
docker run --rm -v "$(pwd)/reports:/reports" grants-ui-performance-tests
```

**Run with custom parameters:**
```bash
# Git Bash on Windows
MSYS_NO_PATHCONV=1 docker run --rm \
  -e DURATION_SECONDS=60 \
  -e RAMPUP_SECONDS=10 \
  -e VU_COUNT=10 \
  -e P95_THRESHOLD_MS=3000 \
  -v "$(pwd)/reports:/reports" \
  grants-ui-performance-tests
```

Reports are written to the `./reports` directory.

## Project Structure

```
grants-ui-performance-tests/
├── scenarios/             # k6 test scenarios (.js files)
│   ├── lib/               # Vendored third-party k6 libraries
│   ├── example-grant-with-auth.js
│   └── users.csv          # User data (CRNs for authentication)
├── reports/               # Generated test reports (gitignored)
├── data-seeding/          # Tools for seeding backend test data
├── Dockerfile             # Container image definition
├── entrypoint.sh          # Test execution script
├── generate-report.sh     # HTML report generation script
└── README.md
```

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

The `users.csv` file contains Customer Reference Numbers (CRNs) for 700 unique test users. These users match the 700 available users in the `fcp-defra-id-stub` service in **Perf-Test**.

**Format:**
```csv
crn
1000000001
1000000002
...
1000000700
```

## CI Pipeline

**Manual Execution:**
- Tests can be triggered on-demand via CDP Portal
- Environment-specific configurations are managed as CDP Portal secrets

## Data Seeding

We seed the `grants-ui-backend` MongoDB database with a year of background data to replicate querying over a large dataset for PRR purposes. The [data-seeding](data-seeding/README.md) directory contains a script to generate JSONL files that can be embedded in a `grants-ui-backend` hot fix release for direct MongoDB import.

## Related Repositories

- [grants-ui](https://github.com/DEFRA/grants-ui) - Grants application frontend service
- [grants-ui-backend](https://github.com/DEFRA/grants-ui-backend) - Backend service, included in the scope of these tests
- [fcp-defra-id-stub](https://github.com/DEFRA/fcp-defra-id-stub) - Authentication stub for testing

## Support

For questions or issues, contact the Grants Application Enablement (GAE) team.

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
