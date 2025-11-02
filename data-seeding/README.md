# Seeding grants-ui-backend data

This directory contains a Node.js script for generating JSONL files and a bash script for importing them into MongoDB using mongosh with chunked insertMany operations.

## Overview

The script reads a CSV file of users and generates two JSONL (JSON Lines) files containing test data for the `grant-application-state` and `grant_application_submissions` collections. It creates documents for 2 sample grants (adding-value, laying-hens) per user. A bash script then imports these files in chunks to avoid timeout issues.

## Structure

```
data-seeding/
├── seed-grants-ui-backend.js      # Main script to generate JSONL files
├── package.json                   # Dependencies
├── resources/                     # Input files
│   ├── users.csv                  # CSV of users (CRN, SBI)
│   ├── state-example.json         # Template for grant-application-state documents
│   └── submission-example.json    # Template for grant_submission_state documents
├── upload/                        # Files to upload in CDP terminal
│   ├── state-documents.jsonl      # JSONL file for grant-application-state
│   ├── submission-documents.jsonl # JSONL file for grant_application_submissions
│   └── import-jsonl.sh            # Bash script to import JSONL files in chunks
└── utils/                         # Helper modules
    └── csv-reader.js              # CSV parsing utilities
```

## Input Files

### users.csv
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

1. Install dependencies:
   ```bash
   cd data-seeding
   npm install
   ```

2. Ensure input files are in place:
   - `resources/users.csv` - User data (currently 20,000 users)
   - `resources/state-example.json` - Template for state documents
   - `resources/submission-example.json` - Template for submission documents

## Usage

### Step 1: Generate JSONL Files

Run the script to generate JSONL files:

```bash
node seed-grants-ui-backend.js
```

This will:
1. Read 20,000 users from `users.csv`
2. Load the JSON templates
3. Generate documents for 2 grants per user (adding-value, laying-hens)
4. Write JSONL files and the import script to the `upload/` directory

**Output:**
- 40,000 state documents (20,000 users × 2 grants) in `upload/state-documents.jsonl`
- 40,000 submission documents (20,000 users × 2 grants) in `upload/submission-documents.jsonl`
- Import script in `upload/import-jsonl.sh`
- Total: 80,000 documents

### Step 2: Upload to CDP Terminal

Upload the files in the `upload/` directory to the CDP terminal:
- `import-jsonl.sh`
- `state-documents.jsonl`
- `submission-documents.jsonl`

### Step 3: Import to MongoDB

After uploading to the CDP terminal, make the bash script executable and run the imports:

```bash
# Make the script executable (required after upload)
chmod 777 import-jsonl.sh

# Import state documents (uses default chunk size of 1000)
./import-jsonl.sh grant-application-state state-documents.jsonl

# Import submission documents with custom chunk size
./import-jsonl.sh grant_application_submissions submission-documents.jsonl 500
```

### Import Script Options

The `import-jsonl.sh` script accepts:
- **Argument 1**: Collection name - MongoDB collection name (required)
- **Argument 2**: JSONL file - Path to JSONL file to import (required)
- **Argument 3**: Chunk size - Number of documents per chunk (optional, default: 1000)

**How it works:**
1. Splits the JSONL file into chunks of the specified size
2. For each chunk, creates a mongosh script with an `insertMany` command
3. Executes each script via `mongosh < script.js` (uses default mongosh connection)
4. Cleans up temporary files

**Tuning chunk size:**
- If you encounter timeouts, reduce chunk size (e.g., 500 or 250)
