import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { readCSV } from './utils/csv-reader.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Reads a JSON template file
 */
async function readTemplate(filename) {
  const templatePath = path.join(__dirname, 'resources', filename)
  const content = await fs.readFile(templatePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Replaces placeholders in a template object
 */
function replacePlaceholders(template, replacements) {
  const jsonString = JSON.stringify(template)
  let result = jsonString

  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`
    result = result.replaceAll(placeholder, value)
  }

  return JSON.parse(result)
}

/**
 * Main seeding function
 */
async function seedData() {
  try {
    console.log('Starting mongosh insert script generation...')

    // Load input files
    const users = await readCSV('./resources/users.csv')

    const stateTemplate = await readTemplate('state-example.json')
    const submissionTemplate = await readTemplate('submission-example.json')
    console.log('Loaded JSON templates')

    // Clear JSONL files and recreate upload directory
    const uploadPath = path.join(__dirname, 'upload')

    // Remove only JSONL files if directory exists
    try {
      const files = await fs.readdir(uploadPath)
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          await fs.unlink(path.join(uploadPath, file))
        }
      }
    } catch (err) {
      // Directory doesn't exist, create it
      await fs.mkdir(uploadPath, { recursive: true })
    }
    console.log('Cleared JSONL files from upload directory')

    // Open JSONL output files for writing
    const stateOutputPath = path.join(uploadPath, 'state-documents.jsonl')
    const submissionOutputPath = path.join(uploadPath, 'submission-documents.jsonl')

    const grantCodes = ['adding-value', 'laying-hens']

    // Create write streams for JSONL files
    const stateLines = []
    const submissionLines = []
    let documentCount = 0

    // Process each user
    for (const user of users) {
      // Generate documents for each grant
      for (const grantCode of grantCodes) {
        const timestamp = new Date().toISOString()
        const referenceNumber = randomUUID().toLowerCase()

        // Generate state document
        const stateDoc = replacePlaceholders(stateTemplate, {
          CRN: user.CRN,
          SBI: user.SBI,
          GRANT_CODE: grantCode,
          TIMESTAMP: timestamp,
          REFERENCE_NUMBER: referenceNumber
        })
        stateLines.push(JSON.stringify(stateDoc))

        // Generate submission document
        const submissionDoc = replacePlaceholders(submissionTemplate, {
          CRN: user.CRN,
          SBI: user.SBI,
          GRANT_CODE: grantCode,
          TIMESTAMP: timestamp,
          REFERENCE_NUMBER: referenceNumber
        })
        submissionLines.push(JSON.stringify(submissionDoc))

        documentCount++
      }
    }

    // Write JSONL files (one JSON document per line)
    await fs.writeFile(stateOutputPath, stateLines.join('\n'), 'utf-8')
    await fs.writeFile(submissionOutputPath, submissionLines.join('\n'), 'utf-8')

    console.log('JSONL files generated!')
    console.log(`Generated ${stateLines.length} state documents in state-documents.jsonl`)
    console.log(`Generated ${submissionLines.length} submission documents in submission-documents.jsonl`)

    process.exit(0)
  } catch (error) {
    console.error('Fatal error during script generation:', error)
    process.exit(1)
  }
}

// Run the seeding process
seedData()
