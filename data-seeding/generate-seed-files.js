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
    console.log('Starting JSONL file generation...')

    // Load input files
    const users = await readCSV('./resources/seed-users.csv')

    const stateTemplate = await readTemplate('state-example.json')
    const submissionTemplate = await readTemplate('submission-example.json')
    console.log(`Loaded JSON templates for ${users.length} users`)

    // Setup output directory
    const outputPath = path.join(__dirname, 'output')

    // Clear and recreate output directory
    try {
      await fs.rm(outputPath, { recursive: true, force: true })
    } catch (err) {
      // Ignore errors if directory doesn't exist
    }
    await fs.mkdir(outputPath, { recursive: true })
    console.log('Cleared output directory')

    const grantCodes = ['adding-value', 'laying-hens']

    // Create arrays to hold all documents
    const stateLines = []
    const submissionLines = []

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
      }
    }

    // Write JSONL files for each collection
    const stateOutputPath = path.join(outputPath, 'grant-application-state.jsonl')
    const submissionOutputPath = path.join(outputPath, 'grant_application_submissions.jsonl')

    await fs.writeFile(stateOutputPath, stateLines.join('\n'), 'utf-8')
    await fs.writeFile(submissionOutputPath, submissionLines.join('\n'), 'utf-8')

    console.log('')
    console.log('JSONL files generated successfully!')
    console.log(`Output directory: ${outputPath}`)
    console.log('')
    console.log(`grant-application-state.jsonl: ${stateLines.length} documents`)
    console.log(`grant_application_submissions.jsonl: ${submissionLines.length} documents`)
    console.log('')
    console.log('These files are ready to be embedded in a grants-ui-backend hot fix release')
    console.log('for direct MongoDB import via a temporary endpoint.')

    process.exit(0)
  } catch (error) {
    console.error('Fatal error during JSONL generation:', error)
    process.exit(1)
  }
}

// Run the seeding process
seedData()
