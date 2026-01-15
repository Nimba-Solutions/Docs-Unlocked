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
            // Set container ID BEFORE loading script - this is critical!
            // The script will auto-initialize when it loads and looks for this ID
            container.id = 'docs-app-root';
            
            console.log('[DocsUnlocked LWC] Container ID set, loading script bundle...');
            
            // Load the main JS bundle (CSS is inlined in the JS)
            // The script will auto-initialize when it loads
            await loadScript(this, DOCS_UNLOCKED);
            
            console.log('[DocsUnlocked LWC] Script loaded, calling initDocsApp...');
            
            // Give script time to fully execute
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Explicitly call initDocsApp - pass the container element directly, not ID
            // This avoids shadow DOM issues where document.getElementById won't work
            if (window.initDocsApp && typeof window.initDocsApp === 'function') {
                console.log('[DocsUnlocked LWC] Calling window.initDocsApp with container element...');
                // Pass container element directly instead of ID
                window.initDocsApp(container);
            } else if (window.DocsUnlocked && window.DocsUnlocked.initDocsApp) {
                console.log('[DocsUnlocked LWC] Calling window.DocsUnlocked.initDocsApp with container element...');
                window.DocsUnlocked.initDocsApp(container);
            } else {
                throw new Error('initDocsApp function not found on window or window.DocsUnlocked');
            }
            
            // Give React time to render
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Check if React app was initialized (container should have content)
            const childCount = container.children ? container.children.length : 0;
            if (childCount === 0) {
                console.warn('[DocsUnlocked LWC] Container still empty after initDocsApp call - check console for errors');
            } else {
                console.log('[DocsUnlocked LWC] App initialized successfully (container has ' + childCount + ' children)');
            }
        } catch (error) {
            // Serialize error for Salesforce console (can't log objects directly)
            const errorMessage = error?.message || (error?.toString ? error.toString() : String(error)) || 'Unknown error occurred';
            const errorStack = error?.stack || '';
            const errorName = error?.name || 'Error';
            
            // Safe console logging for Salesforce - stringify everything, no template literals with objects
            console.error('[DocsUnlocked LWC] Error loading: ' + errorName + ' - ' + errorMessage);
            if (errorStack) {
                console.error('[DocsUnlocked LWC] Stack: ' + errorStack.substring(0, 500));
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
