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
            
            console.log('[DocsUnlocked LWC] Script loaded - auto-initialization should occur automatically');
            
            // Give it time to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if React app was initialized (container should have content)
            if (container.children.length === 0) {
                console.warn('[DocsUnlocked LWC] Container still empty after script load - check console for errors');
                // Don't throw - let the script handle errors
            } else {
                console.log('[DocsUnlocked LWC] App appears to have initialized (container has children)');
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
