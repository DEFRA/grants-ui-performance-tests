# Grants UI performance review

Date: 2026-07-10

## Baseline status

No baseline run was available in the workspace (the scenario targets the remote
`perf-test` host and requires its seeded DAL users). Before changing application
code, capture five identical runs with the same `HOST_URL`, `VU_COUNT`,
`RAMPUP_SECONDS`, `DURATION_SECONDS`, and `P95_THRESHOLD_MS`. Keep each
`metrics.json` and record the p95 and mean for every `duration_*` metric.

For an iteration, compare the mean of the five run means (and separately the
mean of the five p95s). Report the aggregate change as:

```
decrease (%) = (baseline_mean - iteration_mean) / baseline_mean * 100
```

Do not average percentages from individual pages; weight the page values by
their sample count or report the per-page values separately.

## Test-harness findings

### Metrics are one request out of phase

Each group records `response.timings.duration` **before** calling
`submitJourneyForm`. Consequently `duration_multiline_text_field` contains the
timing for the request that produced the multiline page (the preceding
`select-field` submission), while the group label says multiline. The same
problem affects every page metric, including `duration_multi_field_form` (it
records the preceding hidden-field request). This can make an unrelated slow
page fail the named threshold and explains intermittent, apparently
component-specific failures.

Fix the harness by recording a metric immediately after the request whose
response is being measured, or by making `submitJourneyForm(fields, trend)` add
the trend after `response = response.submitForm(...)`. Preserve the existing
group and URL checks, but make the metric/page association explicit.

### The human-delay sleep is not measured

`submitJourneyForm` sleeps for three seconds, then the metric reads k6's
`response.timings.duration`. k6's timing is the HTTP request timing only, so the
sleep changes load generation and request spacing but not the page metric. Keep
the sleep only if the goal is human-like arrival patterns; otherwise make it an
explicit, documented load-model option.

### The run is not a clean per-page benchmark

One virtual user performs the entire journey, with login, clear-state,
redirects, persistence writes, and a final GAS submission. A slow dependency
or an earlier request can therefore affect later pages through queueing and
shared backend load. For diagnosis, retain the end-to-end scenario but add a
short, isolated scenario for the multiline and multi-field pages once a seeded
state/cookie fixture exists.

## Grants UI findings

The request path intentionally persists state through grants-ui-backend on each
form submission. `createServer` primes the combined state/definition request in
`onPostAuth`, and `StatePersistenceService` memoises it per request; this avoids
a duplicate read. There is no evidence in the inspected code that multiline
text or the multi-field page triggers an extra backend read.

The remaining costs to measure (rather than optimise speculatively) are:

1. grants-ui-backend read/write latency for the POST that follows each page;
2. forms-engine validation of the textarea and all components on the
   multi-field page; and
3. Nunjucks rendering of the resulting page, especially the multi-field page's
   guidance and validation markup.

Add server-side timings around those boundaries (request-scoped metrics or
OpenTelemetry spans) and compare them with k6 `http_req_waiting`. If backend
time dominates, optimise the backend round trip/connection pool. If validation
dominates, profile the forms-engine validators and avoid rebuilding schemas or
models per request. If rendering dominates, cache immutable form-definition
derived view data and avoid repeated transformations in controllers. Do not
cache user state or rendered pages across users.

## Recommended order

1. Correct metric attribution and produce the five-run baseline.
2. Add boundary timings and run isolated reproductions for the two suspect
   pages.
3. Make one application change at a time; repeat the five-run protocol.
4. Report per-page mean/p95 deltas and the weighted aggregate decrease.
