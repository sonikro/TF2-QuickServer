#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates the db/bans.csv file for:
 * 1. Valid CSV structure
 * 2. Correct Steam3 ID format (U:1:xxxxxxxxx)
 */

const BANS_FILE_PATH = path.join(__dirname, '..', 'db', 'bans.csv');
const STEAM3_ID_REGEX = /^U:1:\d+$/;

function validateCsvStructure(content) {
  const lines = content.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Check header
  const header = lines[0];
  const expectedHeaders = ['steam_id', 'discord_user_id', 'created_at', 'reason'];
  const actualHeaders = header.split(',').map(h => h.trim());
  
  if (actualHeaders.length !== expectedHeaders.length) {
    throw new Error(`Expected ${expectedHeaders.length} columns, found ${actualHeaders.length}`);
  }

  for (let i = 0; i < expectedHeaders.length; i++) {
    if (actualHeaders[i] !== expectedHeaders[i]) {
      throw new Error(`Expected header '${expectedHeaders[i]}' at position ${i}, found '${actualHeaders[i]}'`);
    }
  }

  // Validate each data row
  for (let lineNum = 1; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();
    if (line === '') continue; // Skip empty lines
    
    const columns = line.split(',');
    if (columns.length !== expectedHeaders.length) {
      throw new Error(`Line ${lineNum + 1}: Expected ${expectedHeaders.length} columns, found ${columns.length}`);
    }
  }

  return lines;
}

function validateSteam3Ids(lines) {
  const errors = [];
  
  for (let lineNum = 1; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();
    if (line === '') continue; // Skip empty lines
    
    const columns = line.split(',');
    const steamId = columns[0].trim();
    
    if (steamId === '') {
      errors.push(`Line ${lineNum + 1}: Steam ID cannot be empty`);
      continue;
    }
    
    if (!STEAM3_ID_REGEX.test(steamId)) {
      errors.push(`Line ${lineNum + 1}: Invalid Steam3 ID format '${steamId}'. Expected format: U:1:xxxxxxxxx`);
    }
  }
  
  return errors;
}



function runValidation() {
  console.log('Validating bans.csv file...');
  
  try {
    // Check if file exists
    if (!fs.existsSync(BANS_FILE_PATH)) {
      throw new Error(`Bans file not found at: ${BANS_FILE_PATH}`);
    }

    // Read file content
    const content = fs.readFileSync(BANS_FILE_PATH, 'utf-8');
    
    // Validate CSV structure
    console.log('✓ Checking CSV structure...');
    const lines = validateCsvStructure(content);
    console.log(`✓ CSV structure is valid (${lines.length - 1} ban entries)`);
    
    // Validate Steam3 IDs
    console.log('✓ Checking Steam3 ID formats...');
    const steamIdErrors = validateSteam3Ids(lines);
    
    if (steamIdErrors.length > 0) {
      console.error('✗ Steam3 ID validation failed:');
      steamIdErrors.forEach(error => console.error(`  ${error}`));
      return false;
    }
    
    console.log('✓ All Steam3 IDs are valid');
    console.log('✅ bans.csv validation passed!');
    return true;
    
  } catch (error) {
    console.error('✗ Validation failed:', error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  
  // Check if --validate-only flag is provided
  if (args.includes('--validate-only')) {
    const validationPass = runValidation();
    process.exit(validationPass ? 0 : 1);
    return;
  }
  
  // Check if --test-only flag is provided
  if (args.includes('--test-only')) {
    const { runTests } = require('./validate-bans.spec.js');
    const testsPass = runTests();
    process.exit(testsPass ? 0 : 1);
    return;
  }
  
  // Run tests first, then validation (for backward compatibility)
  const { runTests } = require('./validate-bans.spec.js');
  const testsPass = runTests();
  if (!testsPass) {
    process.exit(1);
  }
  
  const validationPass = runValidation();
  process.exit(validationPass ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateCsvStructure, validateSteam3Ids };