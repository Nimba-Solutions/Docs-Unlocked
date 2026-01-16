#!/usr/bin/env node

/**
 * Create a ZIP StaticResource containing all documentation content
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../public/content');
const mediaDir = path.join(__dirname, '../public/media');
const targetZip = path.join(__dirname, '../force-app/main/default/staticresources/docsContent.zip');
const targetDir = path.dirname(targetZip);

async function createContentZip() {
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Check if content directory exists
  if (!fs.existsSync(contentDir)) {
    console.error('Error: Content directory not found:', contentDir);
    process.exit(1);
  }

  console.log('📦 Creating content ZIP StaticResource...');
  console.log('   Source:', path.join(__dirname, '../public'));
  console.log('   Target:', targetZip);

  return new Promise((resolve, reject) => {
    const output = createWriteStream(targetZip);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      console.log('✓ Content ZIP created:', archive.pointer(), 'bytes');
      resolve();
    });

    archive.on('error', (err) => {
      console.error('Error creating ZIP:', err);
      reject(err);
    });

    archive.pipe(output);

    // Add content directory, preserving directory structure
    archive.directory(contentDir, 'content', false);
    
    // Add media directory if it exists
    if (fs.existsSync(mediaDir)) {
      archive.directory(mediaDir, 'media', false);
      console.log('   ✓ Including media directory');
    }

    archive.finalize();
  });
}

async function createMetadataFile() {
  const metadataPath = path.join(targetDir, 'docsContent.resource-meta.xml');
  const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
    <cacheControl>Public</cacheControl>
    <contentType>application/zip</contentType>
</StaticResource>`;

  fs.writeFileSync(metadataPath, metadata);
  console.log('✓ Metadata file created:', metadataPath);
}

async function main() {
  try {
    await createContentZip();
    await createMetadataFile();
    console.log('✓ Content StaticResource ready for deployment');
  } catch (error) {
    console.error('Error creating content StaticResource:', error);
    process.exit(1);
  }
}

main();
