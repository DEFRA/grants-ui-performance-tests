import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads and parses a CSV file
 * @param {string} relativePath - Path to CSV file relative to seeding directory
 * @returns {Promise<Array<Object>>} Parsed CSV data as array of objects
 */
export async function readCSV(relativePath) {
  try {
    const seedingDir = path.resolve(__dirname, '..');
    const fullPath = path.resolve(seedingDir, relativePath);

    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());

    // Parse data rows
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });

    return data;
  } catch (error) {
    throw new Error(`Failed to read CSV file: ${error.message}`);
  }
}
