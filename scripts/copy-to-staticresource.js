#!/usr/bin/env node

/**
 * Copy built bundle to StaticResource location for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFile = path.join(__dirname, '../dist-sf/docs-unlocked.js');
const targetFile = path.join(__dirname, '../force-app/main/default/staticresources/docsUnlocked.js');

if (!fs.existsSync(sourceFile)) {
    console.error('Error: Built bundle not found. Run npm run build:sf first.');
    process.exit(1);
}

// Ensure target directory exists
const targetDir = path.dirname(targetFile);
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Copy the file
fs.copyFileSync(sourceFile, targetFile);
console.log('✓ Bundle copied to StaticResource location');
