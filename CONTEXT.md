# grants-ui-performance-tests

k6 performance tests for Grants UI journeys, including report generation and backend data seeding support.

## Language

**Performance test**
A k6 run that measures Grants UI journey behaviour under configured load.
_Avoid_: Smoke test, Acceptance test, Unit test

**Scenario**
A k6 script targeting a specific grant application journey.
_Avoid_: Spec, Feature, Page object

**Virtual user**
A k6 execution user counted by `VU_COUNT`.
_Avoid_: Real user, Test account, Browser session

**Ramp up**
The period controlled by `RAMPUP_SECONDS` during which load increases to the target virtual-user count.
_Avoid_: Warmup unless explicitly separate, Startup

**p95 threshold**
The 95th percentile response-time limit configured by `P95_THRESHOLD_MS`.
_Avoid_: Average response time, SLA unless agreed externally

**Page load metric**
A `duration_<page>` Trend recorded for each journey page.
_Avoid_: Browser timing, HTTP status, Assertion

**Reference number assertion**
The check that a confirmation page contains a valid application reference number after submission.
_Avoid_: Screenshot check, Smoke check, Status check

**DAL user**
A test user sourced from the Data Access Layer and represented by CRN data.
_Avoid_: Random user, Fixture account when DAL identity matters
