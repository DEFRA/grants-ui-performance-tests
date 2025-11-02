# grants-ui-performance-tests

## Overview

Performance test suite for Defra's [grants-ui](https://github.com/DEFRA/grants-ui) platform, maintained by the Grants Application Enablement (GAE) team.

## Test Coverage

The suite provides performance testing for:
- Non-land based grant application journeys served by `grants-ui`
- Reusable `grants-ui` components

## Technology Stack

- **Apache JMeter** for load testing and performance measurement

## Test Plans

Individual test plans are located in the `/scenarios` directory, with each plan targeting a specific grant application journey.

Current test plans:
- `example-grant-with-auth.jmx` - Example grant application with Defra ID authentication

## Test Execution Styles

Test plans support two distinct execution styles aligned with the Non-Functional Requirements (NFRs) for grant applications:

### Response Time Testing

**Purpose:** Measure average response times under maximum load conditions.

**Configuration:**
- Duration: 180 seconds (3 minutes)
- Ramp-up: 30 seconds
- Concurrent users: 100
- User behavior: Recycle

**Environment variables:**
```bash
# set in CDP portal
RAMPUP_SECONDS=30
THREAD_COUNT=100
DURATION_SECONDS=180
CSV_RECYCLE_ON_EOF=true
CSV_STOP_ON_EOF=false
```

This test runs as many journeys as possible within the time limit, recycling through the available test users to maintain consistent load.

### Scalability Testing

**Purpose:** Verify system can handle the target number of individual user journeys.

**Configuration:**
- Duration: 3600 seconds (1 hour)
- Ramp-up: 3600 seconds (gradual increase over full duration)
- Concurrent users: 50 (max concurrent)
- User behavior: No recycling (700 unique journeys, one per user)

**Environment variables:**
```bash
# set in CDP portal
RAMPUP_SECONDS=3600
THREAD_COUNT=50
DURATION_SECONDS=3600
CSV_RECYCLE_ON_EOF=false
CSV_STOP_ON_EOF=false
```

This test executes exactly 700 individual user journeys (one per user in `users.csv`), ramping up gradually to a maximum of 50 concurrent users over the hour.

### Test Assertions

Each test plan includes:

**Response Status Code Assertion:**
- Validates all responses return HTTP 200

**Rolling Response Time Assertion:**
- Monitors average response time across all requests (excluding Defra ID stub)
- Fails if average exceeds 3000ms threshold after minimum 20 samples

### Configuration Parameters

All test plans are parameterized via environment variables, set as secrets in the CDP portal:

| Variable | Default | Description |
|----------|---------|-------------|
| `RAMPUP_SECONDS` | `30` | Time to ramp up to target thread count |
| `THREAD_COUNT` | `100` | Number of concurrent threads (virtual users) |
| `DURATION_SECONDS` | `180` | Total test duration in seconds |
| `CSV_RECYCLE_ON_EOF` | `true` | Whether to recycle CSV user data when reaching end of file |
| `CSV_STOP_ON_EOF` | `false` | Whether to stop threads when reaching end of  CSV file |

## Running Tests

### Via CDP Portal

Tests are executed from the CDP Portal under the **Test Suites** section for the **Perf-Test** environment.

**Prerequisites:**
Environment variables must be configured as secrets in the CDP Portal for the **Perf-Test** environment

**Execution:**
1. Navigate to Test Suites in the CDP Portal.
2. Configure the test style (Response Time or Scalability) via environment variables.
3. Execute the test
4. View reports directly in the portal once the test completes

**Reports:**
- CSV results are automatically uploaded to S3
- HTML reports are generated and published to S3
- Both are accessible through the CDP Portal interface

### Running Locally

Use the JMeter GUI for local development and debugging:

**Prerequisites:**
- Apache JMeter 5.6.3 or higher
- Java 8 or higher

**Steps:**
1. Open JMeter GUI
2. Load a test plan from `/scenarios` directory
3. Configure HTTP Request Defaults to point to your target environment:
   - Set `Server Name` to your `grants-ui` instance (local or hosted)
4. Set User Defined Variables in the Test Plan if you want to override defaults
5. Run the test via JMeter GUI

**Local test data:**
- Ensure `users.csv` is present in the same directory as the test plan
- Update URLs in HTTP Samplers to match your local environment

## Project Structure

```
.
├── scenarios/             # JMeter test plans (.jmx files)
│   └── example-grant-with-auth.jmx
│   └── users.csv          # User data (CRNs for authentication)
├── data-seeding/          # Tools for seeding backend test data
├── Dockerfile             # Container image definition
├── entrypoint.sh          # Test execution script
└── README.md
```

## Test Data

The `users.csv` file contains Customer Reference Numbers (CRNs) for 700 unique test users. These users match the 700 available users in the `fcp-defra-id-stub` service in **Perf-Test**.

**Format:**
```csv
1000000001
1000000002
...
1000000700
```

## Modifying Test Plans

**IMPORTANT:** When editing `.jmx` files in JMeter GUI, be aware that JMeter may automatically convert parameterized properties back to their original types, breaking variable substitution.

If you edit the test plan in JMeter GUI, verify these properties remain as `stringProp` (not `intProp`, `longProp`, or `boolProp`):

**ThreadGroup:**
- `ThreadGroup.num_threads` - must be `stringProp` (not `intProp`)
- `ThreadGroup.ramp_time` - must be `stringProp` (not `intProp`)
- `ThreadGroup.duration` - must be `stringProp` (not `longProp`)

**CSV Data Set Config:**
- `recycle` - must be `stringProp` (not `boolProp`)
- `stopThread` - must be `stringProp` (not `boolProp`)

XML comments are included in the test plans as reminders. After saving changes in JMeter GUI, manually verify these properties in the XML.

## Troubleshooting

**Test Fails Immediately:**
- Check that `users.csv` exists and is accessible
- Verify target URLs in test plan are reachable
- Ensure environment variables are set correctly

**Variable Substitution Not Working:**
- Open the `.jmx` file in a text editor
- Verify parameterized properties are `stringProp` (not typed props)
- Check User Defined Variables are defined in the Test Plan
- Confirm Java properties are passed via `-J` flags in `entrypoint.sh`

**Results Not Published to S3:**
- Verify `RESULTS_OUTPUT_S3_PATH` environment variable is set
- Check S3 endpoint URL is correct
- Ensure AWS credentials are available in the container
- Confirm the test completed successfully (check for `index.html` in reports)

## CI/CD Pipeline

**Manual Execution:**
- Tests can be triggered on-demand via CDP Portal
- Environment-specific configurations are managed as CDP Portal secrets

## Data Seeding

You may want to seed the `grants-ui-backend` MongoDB database with test data to replicate querying over a large dataset. The [data-seeding](data-seeding/README.md) directory contains tools to generate and import test documents.

## Related Repositories

- [grants-ui](https://github.com/DEFRA/grants-ui) - Grants application frontend service
- [grants-ui-backend](https://github.com/DEFRA/grants-ui-backend) - Backend service, included in the scope of these tests
- [ffc-defra-id-stub](https://github.com/DEFRA/ffc-defra-id-stub) - Authentication stub for testing

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
