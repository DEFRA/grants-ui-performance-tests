#!/bin/bash
set -e

if [ -z "$PROFILE" ]; then
  echo "PROFILE is not set. Run e.g. PROFILE=woodland bash run-perf-test.sh"
  exit 1
fi

docker build -t grants-ui-performance-tests .
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd)/reports:/reports" \
  -e PROFILE="$PROFILE" \
  -e VU_COUNT=1 \
  -e DURATION_SECONDS=120 \
  grants-ui-performance-tests
