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
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../public/content');
const mediaDir = path.join(__dirname, '../public/media');
const targetZip = path.join(__dirname, '../force-app/main/default/staticresources/docsContent.zip');
const targetDir = path.dirname(targetZip);

async function generateManifest() {
  const manifest = {};
  
  // Helper to extract numeric prefix and clean name
  function parseSegment(segment) {
    const match = segment.match(/^(\d+)[.-](.+)$/);
    return match ? match[2] : segment;
  }
  
  // Build simple structure: section name -> array of files
  const entries = fs.readdirSync(contentDir, { withFileTypes: true });
  
  entries.forEach(entry => {
    if (entry.isDirectory()) {
      const sectionName = parseSegment(entry.name);
      const sectionPath = path.join(contentDir, entry.name);
      const files = fs.readdirSync(sectionPath, { withFileTypes: true });
      
      manifest[sectionName] = files
        .filter(f => f.isFile() && f.name.endsWith('.md'))
        .map(file => {
          const filePath = path.join(sectionPath, file.name);
          const fileName = parseSegment(file.name.replace(/\.md$/, ''));
          
          // Extract title from markdown
          let title = '';
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const h1Match = content.match(/^#\s+(.+)$/m);
            title = h1Match ? h1Match[1].trim() : fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          } catch {
            title = fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          
          return {
            title,
            file: path.join(entry.name, file.name).replace(/\\/g, '/'),
            path: `/${sectionName}/${fileName}`
          };
        })
        .sort((a, b) => {
          // Sort by numeric prefix in filename (extract number from filename like "01.introduction.md")
          const aFileName = a.file.split('/').pop() || '';
          const bFileName = b.file.split('/').pop() || '';
          const aMatch = aFileName.match(/^(\d+)[.-]/);
          const bMatch = bFileName.match(/^(\d+)[.-]/);
          return (aMatch ? parseInt(aMatch[1]) : 999) - (bMatch ? parseInt(bMatch[1]) : 999);
        });
    }
  });
  
  const totalFiles = Object.values(manifest).reduce((sum, files) => sum + files.length, 0);
  console.log(`✓ Generated manifest with ${Object.keys(manifest).length} sections, ${totalFiles} files`);
  
  return manifest;
}

async function createContentZip(includeManifest = true) {
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
  if (!includeManifest) {
    console.log('   ⚠ Skipping manifest.yaml (will be generated from Apex)');
  }

  // Generate manifest only if needed
  let manifest = null;
  if (includeManifest) {
    manifest = await generateManifest();
  }

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

    // Add manifest.yaml only if requested
    if (includeManifest && manifest) {
      archive.append(yaml.dump(manifest, { indent: 2, lineWidth: -1 }), { name: 'content/manifest.yaml' });
      console.log('   ✓ Added manifest.yaml');
    }

    // Add content directory, preserving directory structure (including dots)
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
    // Check for --no-manifest flag
    const includeManifest = !process.argv.includes('--no-manifest');
    await createContentZip(includeManifest);
    await createMetadataFile();
    console.log('✓ Content StaticResource ready for deployment');
  } catch (error) {
    console.error('Error creating content StaticResource:', error);
    process.exit(1);
  }
}

main();
