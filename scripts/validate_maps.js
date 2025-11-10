#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const mapsJsonPath = path.resolve(__dirname, '../maps.json');

try {
  const mapsData = fs.readFileSync(mapsJsonPath, 'utf-8');
  const maps = JSON.parse(mapsData);

  if (!Array.isArray(maps)) {
    console.error('Error: maps.json must be an array');
    process.exit(1);
  }

  let validationErrors = 0;

  maps.forEach((mapEntry, index) => {
    if (typeof mapEntry === 'string') {
      console.log(`✓ Map ${index + 1}: ${mapEntry} (string format)`);
    } else if (typeof mapEntry === 'object' && mapEntry !== null) {
      if (!mapEntry.name || !mapEntry.url) {
        console.error(`✗ Map ${index + 1}: Missing 'name' or 'url' property`);
        validationErrors++;
      } else {
        console.log(`✓ Map ${index + 1}: ${mapEntry.name} (object format with custom URL)`);
      }
    } else {
      console.error(`✗ Map ${index + 1}: Invalid format (must be string or object)`);
      validationErrors++;
    }
  });

  if (validationErrors > 0) {
    console.error(`\nValidation failed with ${validationErrors} error(s)`);
    process.exit(1);
  }

  console.log(`\n✓ Successfully validated ${maps.length} maps in maps.json`);
  process.exit(0);

} catch (error) {
  console.error('Error reading or parsing maps.json:', error.message);
  process.exit(1);
}
