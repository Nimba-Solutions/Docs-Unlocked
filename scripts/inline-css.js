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
    
    // Add process polyfill BEFORE the bundle
    const processPolyfill = `
// Polyfill process for browser environment
if (typeof process === 'undefined') {
    window.process = { env: { NODE_ENV: 'production' } };
}
`;
    
    // Wrap entire bundle in try-catch to catch any initialization errors
    jsContent = `
(function() {
    try {
        ${processPolyfill}
        ${cssInjection}
        ${jsContent}
    } catch (e) {
        var errorMsg = e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e));
        console.error('[DocsUnlocked] Bundle initialization error:', errorMsg);
        if (e instanceof Error && e.stack) {
            console.error('[DocsUnlocked] Stack:', e.stack.substring(0, 500));
        }
        // Create fallback initDocsApp
        if (typeof window !== 'undefined') {
            window.initDocsApp = function(containerId) {
                var container = document.getElementById(containerId || 'docs-app-root');
                if (container) {
                    container.innerHTML = '<div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif;"><h2 style="color: #c23934;">Bundle Load Error</h2><p style="color: #333;"><strong>' + errorMsg + '</strong></p></div>';
                }
            };
        }
        throw e; // Re-throw so Salesforce can see it
    }
})();
`;
    
    // Write the updated JS file
    fs.writeFileSync(jsFile, jsContent, 'utf8');
    
    // Optionally delete the CSS file since it's now inlined
    // fs.unlinkSync(cssFile);
    
    console.log('✓ CSS inlined into JS bundle');
} else {
    console.log('⚠ CSS file not found, skipping inline step');
}

// Ensure initDocsApp is attached to window after IIFE execution
// This works around Salesforce sandbox issues where the IIFE namespace might not expose the function
const ensureWindowAttachment = `
// Post-IIFE attachment for Salesforce sandbox compatibility
(function() {
    try {
        var attempts = 0;
        var maxAttempts = 100; // 1 second at 10ms intervals
        
        var checkAndAttach = function() {
            attempts++;
            
            // Method 1: Check if window.DocsUnlocked.initDocsApp exists
            if (typeof window !== 'undefined' && window.DocsUnlocked) {
                var docsUnlocked = window.DocsUnlocked;
                
                // Check if initDocsApp exists on the namespace
                if (docsUnlocked.initDocsApp && typeof docsUnlocked.initDocsApp === 'function') {
                    window.initDocsApp = docsUnlocked.initDocsApp;
                    console.log('[DocsUnlocked Post-IIFE] Found and attached initDocsApp from window.DocsUnlocked');
                    return true;
                }
                
                // Try to access it via Object.getOwnPropertyNames (for non-enumerable properties)
                try {
                    var props = Object.getOwnPropertyNames(docsUnlocked);
                    for (var i = 0; i < props.length; i++) {
                        if (props[i] === 'initDocsApp' && typeof docsUnlocked[props[i]] === 'function') {
                            window.initDocsApp = docsUnlocked[props[i]];
                            console.log('[DocsUnlocked Post-IIFE] Found initDocsApp via getOwnPropertyNames');
                            return true;
                        }
                    }
                } catch (e) {
                    // Ignore
                }
            }
            
            // Method 2: Try to access via the IIFE's return value
            // The IIFE might have stored it differently
            if (typeof window !== 'undefined') {
                // Check all possible locations
                var possibleLocations = [
                    window.DocsUnlocked,
                    window.DocsUnlocked && window.DocsUnlocked.default,
                    window.DocsUnlocked && window.DocsUnlocked.exports,
                ];
                
                for (var i = 0; i < possibleLocations.length; i++) {
                    var loc = possibleLocations[i];
                    if (loc && loc.initDocsApp && typeof loc.initDocsApp === 'function') {
                        window.initDocsApp = loc.initDocsApp;
                        window.DocsUnlocked = window.DocsUnlocked || {};
                        window.DocsUnlocked.initDocsApp = loc.initDocsApp;
                        console.log('[DocsUnlocked Post-IIFE] Found initDocsApp in alternative location');
                        return true;
                    }
                }
            }
            
            return false;
        };
        
        // Try immediately
        if (checkAndAttach()) {
            return;
        }
        
        // Poll until found or timeout
        var checkInterval = setInterval(function() {
            if (checkAndAttach() || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                if (attempts >= maxAttempts) {
                    console.warn('[DocsUnlocked Post-IIFE] Could not find initDocsApp after ' + maxAttempts + ' attempts');
                }
            }
        }, 10);
        
    } catch (e) {
        console.error('[DocsUnlocked Post-IIFE] Failed to attach initDocsApp:', e);
    }
})();
`;

// Append the attachment code
jsContent = fs.readFileSync(jsFile, 'utf8');
if (!jsContent.includes('Post-IIFE attachment')) {
    jsContent += ensureWindowAttachment;
    fs.writeFileSync(jsFile, jsContent, 'utf8');
    console.log('✓ Post-IIFE window attachment added');
}

console.log('✓ Bundle ready for Salesforce StaticResource');
