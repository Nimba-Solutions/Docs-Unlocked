import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import DOCS_UNLOCKED from '@salesforce/resourceUrl/docsUnlocked';

export default class DocsUnlocked extends LightningElement {
    renderedCallback() {
        // Wait for DOM to be ready
        if (!this._initialized) {
            this._initialized = true;
            this.loadDocsApp();
        }
    }

    async loadDocsApp() {
        const container = this.template.querySelector('.docs-container');
        if (!container) {
            console.error('[DocsUnlocked LWC] Docs container not found');
            return;
        }

        try {
            // Set container ID before loading script
            container.id = 'docs-app-root';
            
            console.log('[DocsUnlocked LWC] Loading script bundle...');
            // Load the main JS bundle (CSS is inlined in the JS)
            await loadScript(this, DOCS_UNLOCKED);
            
            console.log('[DocsUnlocked LWC] Script loaded, waiting for execution...');
            // Wait longer to ensure script is fully executed and window.initDocsApp is attached
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Check multiple ways the function might be attached
            let initFn = null;
            
            // Method 1: Direct window.initDocsApp
            if (window.initDocsApp && typeof window.initDocsApp === 'function') {
                initFn = window.initDocsApp;
                console.log('[DocsUnlocked LWC] Found initDocsApp on window');
            }
            // Method 2: window.DocsUnlocked.initDocsApp
            else if (window.DocsUnlocked && typeof window.DocsUnlocked.initDocsApp === 'function') {
                initFn = window.DocsUnlocked.initDocsApp;
                console.log('[DocsUnlocked LWC] Found initDocsApp in DocsUnlocked namespace');
            }
            // Method 3: Check if Vite created a DocsUnlocked IIFE namespace
            else if (typeof window.DocsUnlocked !== 'undefined' && window.DocsUnlocked) {
                // Vite IIFE might expose it differently
                const docsUnlocked = window.DocsUnlocked;
                if (docsUnlocked.initDocsApp && typeof docsUnlocked.initDocsApp === 'function') {
                    initFn = docsUnlocked.initDocsApp;
                    console.log('[DocsUnlocked LWC] Found initDocsApp in DocsUnlocked object');
                } else if (typeof docsUnlocked === 'function') {
                    // Maybe the whole thing is the init function?
                    initFn = docsUnlocked;
                    console.log('[DocsUnlocked LWC] DocsUnlocked is a function, using it');
                }
            }
            // Method 4: Try globalThis
            else if (typeof globalThis !== 'undefined' && globalThis.initDocsApp) {
                initFn = globalThis.initDocsApp;
                console.log('[DocsUnlocked LWC] Found initDocsApp on globalThis');
            }
            // Method 5: Try self
            else if (typeof self !== 'undefined' && self.initDocsApp) {
                initFn = self.initDocsApp;
                console.log('[DocsUnlocked LWC] Found initDocsApp on self');
            }
            
            if (initFn) {
                console.log('[DocsUnlocked LWC] Calling initDocsApp...');
                initFn('docs-app-root');
            } else {
                // Debug: Log what's actually on window
                const windowKeys = Object.keys(window).slice(0, 50).join(', ');
                const docsUnlockedType = typeof window.DocsUnlocked;
                const docsUnlockedKeys = window.DocsUnlocked && typeof window.DocsUnlocked === 'object' 
                    ? Object.keys(window.DocsUnlocked).join(', ') 
                    : 'N/A';
                
                console.error(`[DocsUnlocked LWC] initDocsApp not found. Window.DocsUnlocked type: ${docsUnlockedType}, keys: ${docsUnlockedKeys}`);
                console.error(`[DocsUnlocked LWC] Sample window keys: ${windowKeys}`);
                
                throw new Error(`initDocsApp function not found. DocsUnlocked type: ${docsUnlockedType}, keys: ${docsUnlockedKeys || 'none'}`);
            }
        } catch (error) {
            // Serialize error for Salesforce console (can't log objects directly)
            const errorMessage = error?.message || (error?.toString ? error.toString() : String(error)) || 'Unknown error occurred';
            const errorStack = error?.stack || '';
            const errorName = error?.name || 'Error';
            
            // Safe console logging for Salesforce
            console.error(`[DocsUnlocked LWC] Error loading: ${errorName} - ${errorMessage}`);
            if (errorStack) {
                console.error(`[DocsUnlocked LWC] Stack: ${errorStack.substring(0, 500)}`);
            }
            
            this.showError(errorMessage, errorStack);
        }
    }

    showError(message, stack) {
        const container = this.template.querySelector('.docs-container');
        if (container) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif;">
                    <h2 style="color: #c23934; margin-bottom: 1rem;">Error Loading Documentation</h2>
                    <p style="color: #333; margin-bottom: 0.5rem;"><strong>${this.escapeHtml(message)}</strong></p>
                    ${stack ? `<pre style="text-align: left; background: #f4f4f4; padding: 1rem; border-radius: 4px; font-size: 0.75rem; overflow-x: auto; max-width: 100%;">${this.escapeHtml(stack.substring(0, 500))}</pre>` : ''}
                    <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
                        Please check the browser console for more details.
                    </p>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
