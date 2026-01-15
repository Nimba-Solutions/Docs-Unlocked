import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import DOCS_UNLOCKED from '@salesforce/resourceUrl/docsUnlocked';

export default class DocsUnlocked extends LightningElement {
    connectedCallback() {
        this.loadDocsApp();
    }

    async loadDocsApp() {
        try {
            // Load the main JS bundle (CSS is inlined in the JS)
            await loadScript(this, DOCS_UNLOCKED);
            
            // Initialize the React app
            const container = this.template.querySelector('.docs-container');
            if (container && window.initDocsApp) {
                // Set the container ID
                container.id = 'docs-app-root';
                window.initDocsApp('docs-app-root');
            }
        } catch (error) {
            console.error('Error loading Docs Unlocked:', error);
            this.showError(error);
        }
    }

    showError(error) {
        const container = this.template.querySelector('.docs-container');
        if (container) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h2>Error Loading Documentation</h2>
                    <p>${error.message || 'Unknown error occurred'}</p>
                    <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
                        Please ensure the docsUnlocked StaticResource is uploaded correctly.
                    </p>
                </div>
            `;
        }
    }
}
