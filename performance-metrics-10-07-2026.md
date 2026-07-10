# K6 performance metrics — 10 July 2026

## Scope

The latest 20 GitHub Actions runs for `DEFRA/grants-ui` were inspected. The
target job was **Docker Build and Acceptance and Performance Tests**. Eighteen
runs contained that job; two push runs did not run it and were excluded.

These runs predate the timing-alignment change on the
`TGC-0000/performance-metrics-in-phase` branch. They are therefore a historical
baseline and should not be compared directly with future corrected-harness
results.

## Threshold failures

Four of eighteen runs failed at least one K6 threshold (22.2%). The configured
threshold in these runs was 500 ms.

| Run | Failed metrics |
| --- | --- |
| [29079759849](https://github.com/DEFRA/grants-ui/actions/runs/29079759849) | `duration_telephone_number_field` |
| [29033817926](https://github.com/DEFRA/grants-ui/actions/runs/29033817926) | `duration_date_parts_field`, `duration_email_address_field`, `duration_month_year_field`, `duration_multiline_text_field`, `duration_number_field_routing`, `duration_number_field_validation`, `duration_select_field` |
| [29032846513](https://github.com/DEFRA/grants-ui/actions/runs/29032846513) | `duration_number_field_validation` |
| [29030282429](https://github.com/DEFRA/grants-ui/actions/runs/29030282429) | `duration_month_year_field`, `duration_multiline_text_field`, `duration_select_field` |

## Suspect metrics

The ranges and standard deviations below are calculated across run-level K6
means and run-level p95s, not across individual K6 samples.

| Metric | Failures | Failure rate | Mean range | SD of means | p95 range | SD of p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Multiline text | 2/18 | 11.1% | 121–313 ms | 56.7 ms | 161–570 ms | 120.2 ms |
| Multi-field form | 0/18 | N/A | 0–0 ms | 0 ms | 0–0 ms | 0 ms |
| Number validation | 2/18 | 11.1% | 130–320 ms | 50.5 ms | 187–626 ms | 132.0 ms |
| Telephone number | 1/18 | 5.6% | 114–388 ms | 69.1 ms | 135–581 ms | 110.3 ms |
| Select field | 2/18 | 11.1% | 134–361 ms | 60.5 ms | 193–577 ms | 114.3 ms |
| Month/year | 2/18 | 11.1% | 128–407 ms | 74.6 ms | 155–766 ms | 168.2 ms |

## Interpretation

Multiline text breached the threshold in two of eighteen runs. However, the
same runs also show failures in unrelated fields, and several other metrics
have comparable variability. This points to shared backend or infrastructure
contention as a likely contributor rather than a multiline-only bottleneck.

`duration_multi_field_form` is zero in every run, so it is not currently
measuring a real sample and must not be treated as a passing performance result.

The multiline failures were:

- Run [29033817926](https://github.com/DEFRA/grants-ui/actions/runs/29033817926): p95 570 ms.
- Run [29030282429](https://github.com/DEFRA/grants-ui/actions/runs/29030282429): failed alongside month/year and select-field metrics.

