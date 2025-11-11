# Seeding grants-ui-backend data

This directory contains a Node.js script for generating JSONL files that can be embedded in a `grants-ui-backend` hot fix release for direct MongoDB import. We seed the `grants-ui-backend` database with a year of background data to replicate querying over a large dataset for PRR purposes.

## Overview

The script reads a CSV file of users and generates two JSON Lines files containing background data for the `grant-application-state` and `grant_application_submissions` collections. It creates documents for 2 sample grants (`adding-value`, `laying-hens`) per user. The generated JSONL files are intended to be embedded in a hot fix release of the `grants-ui-backend` service with a temporary endpoint added that imports them directly into MongoDB.

## Structure

```
data-seeding/
├── generate-seed-files.js                   # Script to generate JSONL files
├── package.json                             # Project metadata (no dependencies required)
├── resources/                               # Input files
│   ├── seed-users.csv                       # CSV of users (CRN, SBI)
│   ├── state-example.json                   # Template for grant-application-state documents
│   └── submission-example.json              # Template for grant_submission_state documents
├── output/                                  # Generated JSONL files
│   ├── grant-application-state.jsonl        # JSONL file for grant-application-state collection
│   └── grant_application_submissions.jsonl  # JSONL file for grant_application_submissions collection
└── utils/                                   # Helper modules
    └── csv-reader.js                        # CSV parsing utilities
```

## Input Files

### seed-users.csv
CSV file with user data containing two columns:
- `CRN`: Customer Reference Number
- `SBI`: Single Business Identifier

Example:
```csv
CRN,SBI
1102838829,106284736
1103623923,107365747
1103313150,106514040
```

The current file contains 20,000 users including the users in the `Perf-Test` Defra ID stub.

### state-example.json
JSON template for documents in the `grant-application-state` collection. Uses placeholders:
- `{{CRN}}` - Replaced with user's CRN
- `{{SBI}}` - Replaced with user's SBI
- `{{GRANT_CODE}}` - Replaced with grant code (adding-value, laying-hens)
- `{{TIMESTAMP}}` - Replaced with current ISO timestamp
- `{{REFERENCE_NUMBER}}` - Replaced with unique UUID

### submission-example.json
JSON template for documents in the `grant_application_submissions` collection. Uses placeholders:
- `{{CRN}}` - Replaced with user's CRN
- `{{SBI}}` - Replaced with user's SBI
- `{{GRANT_CODE}}` - Replaced with grant code (adding-value, laying-hens)
- `{{TIMESTAMP}}` - Replaced with current ISO timestamp
- `{{REFERENCE_NUMBER}}` - Replaced with unique UUID

## Setup

Ensure input files are in place:
- `resources/seed-users.csv` - User data (currently 20,000 users)
- `resources/state-example.json` - Template for state documents
- `resources/submission-example.json` - Template for submission documents

## Usage

### Step 1: Generate JSONL Files

Run the script to generate JSONL files:

```bash
node generate-seed-files.js
```

This will:
1. Read 20,000 users from `resources/seed-users.csv`
2. Load the JSON templates from `resources/`
3. Generate documents for 2 grants per user (`adding-value`, `laying-hens`)
4. Write JSONL files to the `output/` directory

**Output:**
- `output/grant-application-state.jsonl` - 40,000 state documents (20,000 users × 2 grants)
- `output/grant_application_submissions.jsonl` - 40,000 submission documents (20,000 users × 2 grants)
- Total: 80,000 documents

### Step 2: Embed in Hot Fix Release

The generated JSONL files in the `output/` directory are ready to be:

1. Embedded in a `grants-ui-backend` hot fix release
2. Imported via a temporary endpoint in the `grants-ui-backend` service that performs a direct MongoDB import

This approach has proven much faster and more reliable than importing via the CDP Terminal with bash scripts.
