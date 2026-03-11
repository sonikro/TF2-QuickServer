import swaggerJsdoc from 'swagger-jsdoc';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { swaggerOptions } from '@tf2qs/entrypoints/src/http/routes/swaggerOptions';

// This script generates docs/api/openapi.yaml from the shared swaggerOptions definition
// and @openapi JSDoc annotations in the route files.
// Run with: npm run gen:openapi

const spec = swaggerJsdoc(swaggerOptions);
const outputPath = path.resolve('./docs/api/openapi.yaml');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, yaml.dump(spec, { lineWidth: 120 }));

const pathCount = Object.keys((spec as any).paths ?? {}).length;
console.log(`✓ Generated ${outputPath} (${pathCount} paths)`);
