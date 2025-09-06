#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { validateCsvStructure, validateSteam3Ids } = require('./validate-bans.js');

/**
 * Simple test suite for the bans validation script
 */

function runTest(name, testFn) {
  try {
    testFn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    return false;
  }
}

function testValidCsv() {
  const validCsv = `steam_id,discord_user_id,created_at,reason
U:1:123456,,2025-06-21 23:18:58,Test ban
U:1:789012,discord123,2025-06-21 23:19:05,Another ban`;
  
  const lines = validateCsvStructure(validCsv);
  const errors = validateSteam3Ids(lines);
  
  if (errors.length > 0) {
    throw new Error(`Expected no errors, got: ${errors.join(', ')}`);
  }
}

function testInvalidHeader() {
  const invalidCsv = `wrong_header,discord_user_id,created_at,reason
U:1:123456,,2025-06-21 23:18:58,Test ban`;
  
  try {
    validateCsvStructure(invalidCsv);
    throw new Error('Should have thrown error for invalid header');
  } catch (error) {
    if (!error.message.includes('Expected header')) {
      throw new Error(`Wrong error message: ${error.message}`);
    }
  }
}

function testInvalidSteam3Id() {
  const lines = [
    'steam_id,discord_user_id,created_at,reason',
    'STEAM_0:1:123456,,2025-06-21 23:18:58,Wrong format',
    'U:1:abc,,2025-06-21 23:19:05,Non-numeric ID',
    ',,2025-06-21 23:19:12,Empty ID'
  ];
  
  const errors = validateSteam3Ids(lines);
  
  if (errors.length !== 3) {
    throw new Error(`Expected 3 errors, got ${errors.length}: ${errors.join(', ')}`);
  }
  
  if (!errors[0].includes('STEAM_0:1:123456')) {
    throw new Error('Should detect old Steam ID format');
  }
  
  if (!errors[1].includes('U:1:abc')) {
    throw new Error('Should detect non-numeric Steam3 ID');
  }
  
  if (!errors[2].includes('cannot be empty')) {
    throw new Error('Should detect empty Steam ID');
  }
}

function testMissingColumns() {
  const invalidCsv = `steam_id,discord_user_id,created_at,reason
U:1:123456,discord123`;
  
  try {
    validateCsvStructure(invalidCsv);
    throw new Error('Should have thrown error for missing columns');
  } catch (error) {
    if (!error.message.includes('Expected 4 columns')) {
      throw new Error(`Wrong error message: ${error.message}`);
    }
  }
}

function main() {
  console.log('Running validation script tests...\n');
  
  const tests = [
    ['Valid CSV with Steam3 IDs', testValidCsv],
    ['Invalid header detection', testInvalidHeader],
    ['Invalid Steam3 ID detection', testInvalidSteam3Id],
    ['Missing columns detection', testMissingColumns]
  ];
  
  let passedTests = 0;
  
  for (const [name, testFn] of tests) {
    if (runTest(name, testFn)) {
      passedTests++;
    }
  }
  
  console.log(`\n${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}