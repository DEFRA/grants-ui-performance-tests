#!/bin/sh

echo "run_id: $RUN_ID in $ENVIRONMENT"

if [ -n "$CDP_HTTP_PROXY" ]; then
   export HTTP_PROXY="$CDP_HTTP_PROXY"
   export HTTPS_PROXY="$CDP_HTTPS_PROXY"
   export NO_PROXY=".cdp-int.defra.cloud"
fi

mkdir -p /reports

k6 run --out json=/reports/metrics.json scenarios/example-grant-with-auth.js
K6_EXIT_CODE=$?

# Generate HTML report from metrics
./generate-report.sh /reports/metrics.json /reports/report.html

# Publish the results into S3 so they can be displayed in the CDP Portal
if [ -n "$RESULTS_OUTPUT_S3_PATH" ]; then
   # Copy the report file to the S3 bucket
   if [ -f "/reports/report.html" ]; then
      aws --endpoint-url=$S3_ENDPOINT s3 cp "/reports/report.html" "$RESULTS_OUTPUT_S3_PATH/index.html"
      if [ $? -eq 0 ]; then
        echo "Report file published to $RESULTS_OUTPUT_S3_PATH"
      fi
   else
      echo "report not found"
      exit 1
   fi
fi

# exit non-zero if k6 reported threshold failures
if [ $K6_EXIT_CODE -ne 0 ]; then
    echo "K6 REPORTED FAILURES (exit code $K6_EXIT_CODE), EXITING NON-ZERO"
    exit 1
fi
