import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Plugin to fix IIFE global context for Salesforce Locker Service
// Locker Service runs code in strict mode where 'this' at top level is undefined
function fixLockerServiceGlobal(): Plugin {
    return {
        name: 'fix-locker-service-global',
        generateBundle(options, bundle) {
            for (const fileName in bundle) {
                const chunk = bundle[fileName];
                if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
                    // Replace 'this.DocsUnlocked' with 'window.DocsUnlocked' in the IIFE wrapper
                    chunk.code = chunk.code.replace(
                        /\}\)\(this\.DocsUnlocked\s*=\s*this\.DocsUnlocked\s*\|\|\s*\{\}\);/g,
                        '})(window.DocsUnlocked=window.DocsUnlocked||{});'
                    );
                }
            }
        }
    };
}

export default defineConfig(({ command, mode }) => {
    const isSalesforceBuild = mode === 'salesforce';

    if (isSalesforceBuild) {
        return {
            plugins: [react(), fixLockerServiceGlobal()],
            define: {
                // Polyfill process.env for browser
                'process.env': JSON.stringify({ NODE_ENV: 'production' }),
                'process': JSON.stringify({ env: { NODE_ENV: 'production' } }),
            },
            build: {
                lib: {
                    entry: resolve(__dirname, 'src/salesforce.tsx'),
                    name: 'DocsUnlocked',
                    formats: ['iife'],
                    fileName: () => 'docs-unlocked.js',
                },
                rollupOptions: {
                    output: {
                        inlineDynamicImports: true,
                        assetFileNames: 'docs-unlocked.css',
                        // Ensure the IIFE attaches to window
                        format: 'iife',
                        name: 'DocsUnlocked',
                        extend: true,
                        // Force the namespace to be created properly
                        globals: {},
                    },
                },
                outDir: 'dist-sf',
                assetsDir: 'assets',
                cssCodeSplit: false,
                cssMinify: true,
            },
        };
    }

    return {
        plugins: [react()],
    };
})
