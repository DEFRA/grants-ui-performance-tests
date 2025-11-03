#!/bin/bash

# Script to import JSONL files into MongoDB using mongosh
# Splits large JSONL files into chunks and uses insertMany for each chunk

set -e

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <collection-name> <jsonl-file> [chunk-size]"
    echo ""
    echo "Arguments:"
    echo "  collection-name - MongoDB collection name"
    echo "  jsonl-file      - Path to JSONL file to import"
    echo "  chunk-size      - Number of documents per chunk (optional, default: 1000)"
    echo ""
    echo "Examples:"
    echo "  $0 grant-application-state state-documents.jsonl"
    echo "  $0 grant_application_submissions submission-documents.jsonl 500"
    exit 1
fi

COLLECTION=$1
JSONL_FILE=$2
CHUNK_SIZE=${3:-1000}

# Validate input file exists
if [ ! -f "$JSONL_FILE" ]; then
    echo "Error: File '$JSONL_FILE' not found"
    exit 1
fi

# Create temp directory for chunks
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Get total number of lines
TOTAL_LINES=$(grep -c '' "$JSONL_FILE")
echo ""
echo "=========================================="
echo "Processing: $JSONL_FILE"
echo "Collection: $COLLECTION"
echo "Total documents: $TOTAL_LINES"
echo "Chunk size: $CHUNK_SIZE"
echo "=========================================="

# Calculate number of chunks
NUM_CHUNKS=$(( (TOTAL_LINES + CHUNK_SIZE - 1) / CHUNK_SIZE ))
echo "Will process $NUM_CHUNKS chunks"
echo ""

# Split JSONL file into chunks and import each
CURRENT_LINE=1
for ((CHUNK=1; CHUNK<=NUM_CHUNKS; CHUNK++)); do
    echo "Processing chunk $CHUNK/$NUM_CHUNKS..."

    # Extract chunk from JSONL file
    CHUNK_FILE="$TEMP_DIR/chunk_${CHUNK}.jsonl"
    sed -n "${CURRENT_LINE},$((CURRENT_LINE + CHUNK_SIZE - 1))p" "$JSONL_FILE" > "$CHUNK_FILE"

    # Count actual lines in this chunk
    CHUNK_LINES=$(grep -c '' "$CHUNK_FILE")

    if [ $CHUNK_LINES -eq 0 ]; then
        break
    fi

    # Create mongosh script with insertMany
    MONGOSH_SCRIPT="$TEMP_DIR/insert_${CHUNK}.js"

    # Build the documents array from JSONL using awk for reliable line processing
    {
        echo "const documents = ["
        awk '{
            if (NR > 1) print ","
            printf "  %s", $0
        } END {
            if (NR > 0) print ""
        }' "$CHUNK_FILE"
        echo "];"
    } > "$MONGOSH_SCRIPT"
    echo "db.getCollection('$COLLECTION').insertMany(documents, { ordered: false });" >> "$MONGOSH_SCRIPT"
    echo "print('Inserted ' + documents.length + ' documents into $COLLECTION');" >> "$MONGOSH_SCRIPT"

    # Execute mongosh script (pipe output to /dev/null)
    mongosh < "$MONGOSH_SCRIPT" > /dev/null

    # Move to next chunk
    CURRENT_LINE=$((CURRENT_LINE + CHUNK_SIZE))
done

echo ""
echo "=========================================="
echo "Import complete!"
echo "Imported $TOTAL_LINES documents into $COLLECTION"
echo "=========================================="
