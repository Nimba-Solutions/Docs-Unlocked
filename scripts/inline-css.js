#!/usr/bin/env node

/**
 * Inline CSS into JS bundle for Salesforce StaticResource
 * This script reads the built CSS file and injects it into the JS bundle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsFile = path.join(__dirname, '../dist-sf/docs-unlocked.js');
const cssFile = path.join(__dirname, '../dist-sf/docs-unlocked.css');

if (!fs.existsSync(jsFile)) {
    console.error('Error: docs-unlocked.js not found. Run npm run build:sf first.');
    process.exit(1);
}

let jsContent = fs.readFileSync(jsFile, 'utf8');

if (fs.existsSync(cssFile)) {
    const cssContent = fs.readFileSync(cssFile, 'utf8');
    
    // Inject CSS into the JS bundle by creating a style tag
    const cssInjection = `
(function() {
    if (document.getElementById('docs-unlocked-styles')) return;
    const style = document.createElement('style');
    style.id = 'docs-unlocked-styles';
    style.textContent = ${JSON.stringify(cssContent)};
    document.head.appendChild(style);
})();
`;
    
    // Insert CSS injection at the beginning of the IIFE
    jsContent = cssInjection + jsContent;
    
    // Write the updated JS file
    fs.writeFileSync(jsFile, jsContent, 'utf8');
    
    // Optionally delete the CSS file since it's now inlined
    // fs.unlinkSync(cssFile);
    
    console.log('✓ CSS inlined into JS bundle');
} else {
    console.log('⚠ CSS file not found, skipping inline step');
}

console.log('✓ Bundle ready for Salesforce StaticResource');
