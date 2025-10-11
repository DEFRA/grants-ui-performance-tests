# grants-ui-performance-tests

This performance test suite is maintained by Grants Application Enablement (GAE) team, covering:

- Non-land based grant application journeys served by `grants-ui`
- General `grants-ui` components maintained by GAE

There is an individual test plan for each grant in the `/scenarios` directory. To run a specific test plan in CI edit the `TEST_SCENARIO` environment variable set in the Dockerfile.

Each test plan will:

- Run for 180 seconds
- Ramp up to 3 threads following the full grant journey with a 3 second interval between interactions
- Assert that all requests receive an HTTP 200 Ok response
- Assert that the average response time is under 3000 ms

The intention is to prevent an unexpected performance regression being introduced to the service.

### Running locally

Use JMeter GUI. Set the `Server Name` in `HTTP Request Defaults` to an instance of service `forms-runner-v2`, either hosted or local, and use JMeter to run the test. 

### CDP Portal

Tests are run from the CDP Portal under the `Test Suites` section. Before any changes can be run, a new docker image must be built, this will happen automatically when a pull request is merged into the `main` branch. The reports from the test run are then available through the portal.

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
