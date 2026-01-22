#!/bin/sh

# Generate HTML report from k6 metrics.json
# Usage: ./generate-report.sh /reports/metrics.json /reports/report.html

METRICS_FILE="$1"
OUTPUT_FILE="$2"

if [ ! -f "$METRICS_FILE" ]; then
    echo "Metrics file not found: $METRICS_FILE"
    exit 1
fi

# Extract http_req_duration metrics by group to separate files for p95 calculation
mkdir -p /tmp/k6_groups
rm -f /tmp/k6_groups/*

# First grep to temp file, then process (avoids subshell issues with piped while loops)
grep '"metric":"http_req_duration"' "$METRICS_FILE" | grep '"type":"Point"' > /tmp/duration_points.txt

while read -r line; do
    # Extract group name - look for "group":"::example-grant-with-auth::GROUPNAME" or "group":"::GROUPNAME"
    group=$(echo "$line" | sed -n 's/.*"group":"::example-grant-with-auth::\([^"]*\)".*/\1/p')
    if [ -z "$group" ]; then
        group=$(echo "$line" | sed -n 's/.*"group":"::\([^"]*\)".*/\1/p')
    fi
    if [ -z "$group" ]; then
        group="unknown"
    fi

    # Extract value from "value":NUMBER
    value=$(echo "$line" | sed -n 's/.*"value":\([0-9.]*\).*/\1/p')

    if [ -n "$value" ]; then
        echo "$value" >> "/tmp/k6_groups/${group}.txt"
    fi
done < /tmp/duration_points.txt

# Calculate stats for each group including p95
> /tmp/duration_stats.csv
for file in /tmp/k6_groups/*.txt; do
    [ -f "$file" ] || continue
    group=$(basename "$file" .txt)

    # Sort values and calculate stats
    sort -n "$file" > /tmp/sorted_values.txt
    count=$(wc -l < /tmp/sorted_values.txt | tr -d ' ')

    if [ "$count" -gt 0 ]; then
        min=$(head -1 /tmp/sorted_values.txt)
        max=$(tail -1 /tmp/sorted_values.txt)
        avg=$(awk '{sum+=$1} END {printf "%.2f", sum/NR}' /tmp/sorted_values.txt)

        # Calculate p95 index (95th percentile)
        p95_idx=$(awk "BEGIN {printf \"%.0f\", ($count * 95 + 99) / 100}")
        [ "$p95_idx" -lt 1 ] && p95_idx=1
        [ "$p95_idx" -gt "$count" ] && p95_idx=$count
        p95=$(sed -n "${p95_idx}p" /tmp/sorted_values.txt)

        echo "${group},${count},${avg},${min},${max},${p95}" >> /tmp/duration_stats.csv
    fi
done
sort -o /tmp/duration_stats.csv /tmp/duration_stats.csv

# Extract failures by group
> /tmp/failure_stats.csv
rm -f /tmp/failure_groups.txt
grep '"metric":"http_req_failed"' "$METRICS_FILE" | grep '"type":"Point"' | grep '"value":1' > /tmp/failure_points.txt || true

while read -r line; do
    group=$(echo "$line" | sed -n 's/.*"group":"::example-grant-with-auth::\([^"]*\)".*/\1/p')
    if [ -z "$group" ]; then
        group=$(echo "$line" | sed -n 's/.*"group":"::\([^"]*\)".*/\1/p')
    fi
    if [ -z "$group" ]; then
        group="unknown"
    fi
    echo "$group" >> /tmp/failure_groups.txt
done < /tmp/failure_points.txt 2>/dev/null || true

# Count failures per group
if [ -f /tmp/failure_groups.txt ]; then
    sort /tmp/failure_groups.txt | uniq -c > /tmp/failure_counts.txt
    while read -r count grp; do
        echo "${grp},${count}" >> /tmp/failure_stats.csv
    done < /tmp/failure_counts.txt
    rm -f /tmp/failure_groups.txt /tmp/failure_counts.txt
fi

# Generate HTML
cat > "$OUTPUT_FILE" << 'HTMLHEADER'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>k6 Performance Test Report</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 { margin: 0 0 10px 0; color: #7f8c8d; font-size: 14px; }
        .summary-card .value { font-size: 32px; font-weight: bold; color: #2c3e50; }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        th {
            background: #3498db;
            color: white;
            font-weight: 600;
        }
        tr:hover { background: #f8f9fa; }
        tr:last-child td { border-bottom: none; }
        .pass { color: #27ae60; font-weight: bold; }
        .fail { color: #e74c3c; font-weight: bold; }
        .duration { font-family: monospace; }
        .timestamp { color: #95a5a6; font-size: 14px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>k6 Performance Test Report</h1>
HTMLHEADER

# Add timestamp
echo "        <p class=\"timestamp\">Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')</p>" >> "$OUTPUT_FILE"

# Calculate totals for summary
TOTAL_REQUESTS=$(awk -F',' '{sum+=$2} END {print sum+0}' /tmp/duration_stats.csv)
OVERALL_AVG=$(awk -F',' '{sum+=$3; count++} END {if(count>0) printf "%.2f", sum/count; else print "0"}' /tmp/duration_stats.csv)

# Count total failures
TOTAL_FAILURES=0
if [ -f /tmp/failure_stats.csv ] && [ -s /tmp/failure_stats.csv ]; then
    while IFS=',' read -r group failures; do
        TOTAL_FAILURES=$((TOTAL_FAILURES + failures))
    done < /tmp/failure_stats.csv
fi

if [ "$TOTAL_FAILURES" -eq 0 ]; then
    STATUS_CLASS="pass"
    STATUS_TEXT="PASSED"
else
    STATUS_CLASS="fail"
    STATUS_TEXT="FAILED"
fi

# Add summary cards
cat >> "$OUTPUT_FILE" << SUMMARY
        <div class="summary">
            <div class="summary-card">
                <h3>Status</h3>
                <div class="value ${STATUS_CLASS}">${STATUS_TEXT}</div>
            </div>
            <div class="summary-card">
                <h3>Total Requests</h3>
                <div class="value">${TOTAL_REQUESTS}</div>
            </div>
            <div class="summary-card">
                <h3>Failed Requests</h3>
                <div class="value">${TOTAL_FAILURES}</div>
            </div>
            <div class="summary-card">
                <h3>Avg Response Time</h3>
                <div class="value">${OVERALL_AVG}ms</div>
            </div>
        </div>

        <h2>Response Times by Page</h2>
        <table>
            <thead>
                <tr>
                    <th>Page / Group</th>
                    <th>Requests</th>
                    <th>Avg (ms)</th>
                    <th>Min (ms)</th>
                    <th>Max (ms)</th>
                    <th>P95 (ms)</th>
                    <th>Failures</th>
                </tr>
            </thead>
            <tbody>
SUMMARY

# Add table rows - merge duration and failure data
while IFS=',' read -r group requests avg min max p95; do
    # Look up failures for this group
    failures=0
    if [ -f /tmp/failure_stats.csv ]; then
        failures=$(grep "^${group}," /tmp/failure_stats.csv | cut -d',' -f2)
        failures=${failures:-0}
    fi

    if [ "$failures" -eq 0 ] 2>/dev/null; then
        fail_class="pass"
    else
        fail_class="fail"
    fi

    cat >> "$OUTPUT_FILE" << ROW
                <tr>
                    <td><strong>${group}</strong></td>
                    <td>${requests}</td>
                    <td class="duration">${avg}</td>
                    <td class="duration">${min}</td>
                    <td class="duration">${max}</td>
                    <td class="duration">${p95}</td>
                    <td class="${fail_class}">${failures}</td>
                </tr>
ROW
done < /tmp/duration_stats.csv

# Close response times table
cat >> "$OUTPUT_FILE" << 'TABLECLOSE'
            </tbody>
        </table>
TABLECLOSE

# Extract error details (failed requests with their URLs and status codes)
> /tmp/error_details.csv
grep '"metric":"http_req_failed"' "$METRICS_FILE" | grep '"type":"Point"' | grep '"value":1' > /tmp/failed_requests.txt || true

if [ -s /tmp/failed_requests.txt ]; then
    while read -r line; do
        # Extract group
        err_group=$(echo "$line" | sed -n 's/.*"group":"::example-grant-with-auth::\([^"]*\)".*/\1/p')
        if [ -z "$err_group" ]; then
            err_group=$(echo "$line" | sed -n 's/.*"group":"::\([^"]*\)".*/\1/p')
        fi
        if [ -z "$err_group" ]; then
            err_group="unknown"
        fi

        # Extract URL
        err_url=$(echo "$line" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')
        err_url=${err_url:-"N/A"}

        # Extract status code
        err_status=$(echo "$line" | sed -n 's/.*"status":"\{0,1\}\([0-9]*\)"\{0,1\}.*/\1/p')
        err_status=${err_status:-"N/A"}

        # Extract method
        err_method=$(echo "$line" | sed -n 's/.*"method":"\([^"]*\)".*/\1/p')
        err_method=${err_method:-"N/A"}

        echo "${err_group},${err_method},${err_status},${err_url}" >> /tmp/error_details.csv
    done < /tmp/failed_requests.txt

    # Add errors table
    cat >> "$OUTPUT_FILE" << 'ERRORHEADER'

        <h2>Errors</h2>
        <table>
            <thead>
                <tr>
                    <th>Group</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>URL</th>
                </tr>
            </thead>
            <tbody>
ERRORHEADER

    while IFS=',' read -r err_group err_method err_status err_url; do
        cat >> "$OUTPUT_FILE" << ERRORROW
                <tr>
                    <td><strong>${err_group}</strong></td>
                    <td>${err_method}</td>
                    <td class="fail">${err_status}</td>
                    <td style="word-break: break-all;">${err_url}</td>
                </tr>
ERRORROW
    done < /tmp/error_details.csv

    cat >> "$OUTPUT_FILE" << 'ERRORFOOTER'
            </tbody>
        </table>
ERRORFOOTER
fi

rm -f /tmp/failed_requests.txt /tmp/error_details.csv

# Close HTML
cat >> "$OUTPUT_FILE" << 'HTMLFOOTER'
    </div>
</body>
</html>
HTMLFOOTER

rm -rf /tmp/k6_groups /tmp/duration_stats.csv /tmp/failure_stats.csv /tmp/sorted_values.txt

echo "Report generated: $OUTPUT_FILE"
