import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ command, mode }) => {
    const isSalesforceBuild = mode === 'salesforce';

    if (isSalesforceBuild) {
        return {
            plugins: [react()],
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
