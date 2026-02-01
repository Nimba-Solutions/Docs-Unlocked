import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { NavigationMixin } from 'lightning/navigation';
import getTreeAsJson from '@salesforce/apex/StaticResourceTree.getTreeAsJson';
import getFileContent from '@salesforce/apex/StaticResourceTree.getFileContent';
import hasPermission from '@salesforce/apex/PermissionChecker.hasPermission';
import hasCustomPermission from '@salesforce/apex/PermissionChecker.hasCustomPermission';
import hasPermissionSet from '@salesforce/apex/PermissionChecker.hasPermissionSet';
import hasProfile from '@salesforce/apex/PermissionChecker.hasProfile';
import hasObjectAccess from '@salesforce/apex/PermissionChecker.hasObjectAccess';
import hasFieldAccess from '@salesforce/apex/PermissionChecker.hasFieldAccess';
import getDocsContentByApp from '@salesforce/apex/GitHubController.getDocsContentByApp';
import getConfigurationByApp from '@salesforce/apex/GitHubController.getConfigurationByApp';
import getVersionOptionsByApp from '@salesforce/apex/GitHubController.getVersionOptionsByApp';
import DOCS_UNLOCKED from '@salesforce/resourceUrl/docsUnlocked';

export default class DocsUnlocked extends NavigationMixin(LightningElement) {
    // Static resource mode
    @api contentResourceName = 'docsContent';
    
    // Git provider mode - if set, loads from Doc_Source__c with this name
    @api docSourceName = '';
    
    // Display options
    @api displayHeader = false;
    @api headerLabel = 'Documentation';
    @api displayFooter = false;

    // Git provider state
    @track isLoadingGitContent = false;
    @track hasGitError = false;
    @track gitErrorMessage = '';
    @track gitConfig = null;
    @track versionOptions = null;
    @track selectedRef = null;
    @track docsContent = null;

    // Flow embed state
    @track hasActiveFlow = false;
    _activeFlowCallback = null;
    _activeFlowIframe = null;
    _initialized = false;

    renderedCallback() {
        if (!this._initialized) {
            this._initialized = true;
            this.initializeComponent();
        }
    }

    async initializeComponent() {
        // If docSourceName is provided, load from Git provider
        if (this.docSourceName) {
            await this.loadFromGitProvider();
        } else {
            // Use static resource mode
            await this.loadDocsApp();
        }
    }

    // ==================== Git Provider Mode ====================

    async loadFromGitProvider() {
        this.isLoadingGitContent = true;
        this.hasGitError = false;

        try {
            // Load configuration for this doc source
            const config = await getConfigurationByApp({ appIdentifier: this.docSourceName });

            if (!config) {
                throw new Error('No Doc Source found with App Identifier: ' + this.docSourceName);
            }

            this.gitConfig = config;
            this.selectedRef = config.defaultRef;
            console.log('[DocsUnlocked] Found configuration for: ' + this.docSourceName + ', provider: ' + config.provider);

            // Load version options if version switching is allowed
            if (config.allowVersionSwitching) {
                try {
                    this.versionOptions = await getVersionOptionsByApp({ appIdentifier: this.docSourceName });
                } catch (e) {
                    console.warn('[DocsUnlocked] Failed to load version options: ' + e.message);
                }
            }

            // Load the docs content
            await this.loadGitContent();

        } catch (error) {
            console.error('[DocsUnlocked] Error loading configuration: ' + (error.body?.message || error.message || error));
            this.hasGitError = true;
            this.gitErrorMessage = error.body?.message || error.message || 'Failed to load configuration';
            this.isLoadingGitContent = false;
        }
    }

    async loadGitContent() {
        try {
            this.isLoadingGitContent = true;

            const content = await getDocsContentByApp({
                appIdentifier: this.docSourceName,
                ref: this.selectedRef
            });

            this.docsContent = content;

            // Set up window globals for the React app
            this.setupGitWindowGlobals();

            this.isLoadingGitContent = false;
            console.log('[DocsUnlocked] Loaded ' + content.files.length + ' files from ' + this.gitConfig.provider);

            // Wait for DOM to update after isLoadingGitContent changes
            await new Promise(resolve => setTimeout(resolve, 50));

            // Now load the React app
            await this.loadDocsApp();

        } catch (error) {
            console.error('[DocsUnlocked] Error loading docs content: ' + (error.body?.message || error.message || error));
            this.hasGitError = true;
            this.gitErrorMessage = error.body?.message || error.message || 'Failed to load documentation content';
            this.isLoadingGitContent = false;
        }
    }

    setupGitWindowGlobals() {
        const content = this.docsContent;

        // Build a manifest/tree structure from the files
        const manifest = this.buildManifest(content.files);

        // Store preloaded content so React app can access it
        window.DOCS_PRELOADED_CONTENT = {
            manifest: manifest,
            files: content.files.reduce((acc, file) => {
                acc[file.relativePath] = file.content;
                return acc;
            }, {}),
            config: content.config,
            currentRef: content.currentRef
        };

        // Override the tree JSON method to return our preloaded manifest
        window.DOCS_GET_TREE_JSON = async () => {
            return JSON.stringify(manifest);
        };

        // Expose version switching for React header
        console.log('[DocsUnlocked] setupGitWindowGlobals - allowVersionSwitching:', this.gitConfig.allowVersionSwitching);
        console.log('[DocsUnlocked] setupGitWindowGlobals - versionOptions:', this.versionOptions);
        if (this.gitConfig.allowVersionSwitching && this.versionOptions) {
            // Build version options for React (main + tags only)
            const versionOpts = [{ label: 'main', value: 'main' }];
            if (this.versionOptions.tags?.length > 0) {
                for (const tag of this.versionOptions.tags) {
                    versionOpts.push({ label: tag.name, value: tag.name });
                }
            }
            
            const selectorData = {
                enabled: true,
                options: versionOpts,
                currentRef: this.selectedRef,
                onChange: async (newRef) => {
                    this.selectedRef = newRef;
                    await this.loadGitContent();
                }
            };
            
            window.DOCS_VERSION_SELECTOR = selectorData;
            
            // Notify React to update if it's already rendered
            if (window.DOCS_UPDATE_VERSION_SELECTOR) {
                window.DOCS_UPDATE_VERSION_SELECTOR(selectorData);
            }
        } else {
            window.DOCS_VERSION_SELECTOR = { enabled: false };
        }
    }

    buildManifest(files) {
        // Build the tree structure that generateManifestFromTree expects:
        // { content: { "01.section": { "01.file.md": "content/01.section/01.file.md" } } }
        // Also handles flat structures (files directly in content folder)
        const tree = {
            content: {}
        };

        for (const file of files) {
            // Only process .md files
            if (!file.relativePath.endsWith('.md')) {
                continue;
            }

            const parts = file.relativePath.split('/');
            
            if (parts.length >= 2) {
                // e.g., "01.getting-started/01.introduction.md"
                const sectionFolder = parts[0];
                const fileName = parts.slice(1).join('/');
                
                if (!tree.content[sectionFolder]) {
                    tree.content[sectionFolder] = {};
                }
                
                tree.content[sectionFolder][fileName] = 'content/' + file.relativePath;
            } else {
                // Flat structure: file directly in content folder
                // e.g., "introduction.md" -> put in a "_root" section
                const fileName = parts[0];
                
                if (!tree.content['_root']) {
                    tree.content['_root'] = {};
                }
                
                tree.content['_root'][fileName] = 'content/' + file.relativePath;
            }
        }

        console.log('[DocsUnlocked] Built tree for manifest generation:', JSON.stringify(tree));
        console.log('[DocsUnlocked] Files received:', files.map(f => f.relativePath));
        return tree;
    }

    // ==================== Static Resource Mode / React App Loading ====================

    async loadDocsApp() {
        const container = this.template.querySelector('.docs-container');
        if (!container) {
            console.error('[DocsUnlocked LWC] Docs container not found');
            return;
        }

        try {
            container.id = 'docs-app-root';

            // Set configuration as data attributes
            container.setAttribute('data-content-resource', this.contentResourceName);
            container.setAttribute('data-display-header', this.displayHeader);
            container.setAttribute('data-header-label', this.headerLabel || 'Documentation');
            container.setAttribute('data-display-footer', this.displayFooter);

            // Set on window for React app to access
            window.DOCS_CONTENT_RESOURCE_NAME = this.contentResourceName;
            window.DOCS_DISPLAY_HEADER = this.displayHeader === true;
            window.DOCS_HEADER_LABEL = this.headerLabel || 'Documentation';
            window.DOCS_DISPLAY_FOOTER = this.displayFooter === true;
            
            // Derive the content resource base URL from DOCS_UNLOCKED URL
            // This handles both internal SF (/resource/name) and Experience Cloud URLs
            // Experience Cloud URLs look like: /s/sfsites/c/resource/1234567890/docsUnlocked
            const docsUnlockedUrl = DOCS_UNLOCKED;
            let contentResourceBaseUrl;
            
            // Extract the base pattern by replacing 'docsUnlocked' with the content resource name
            // Handle both direct name and name with cache-busting timestamp
            if (docsUnlockedUrl.includes('/docsUnlocked')) {
                contentResourceBaseUrl = docsUnlockedUrl.replace('/docsUnlocked', '/' + this.contentResourceName);
            } else {
                // Fallback: construct based on detected pattern
                const match = docsUnlockedUrl.match(/(.*\/resource\/\d*)\/?/);
                if (match) {
                    contentResourceBaseUrl = match[1] + '/' + this.contentResourceName;
                } else {
                    // Final fallback to simple /resource/ path
                    contentResourceBaseUrl = '/resource/' + this.contentResourceName;
                }
            }
            
            window.DOCS_CONTENT_RESOURCE_BASE_URL = contentResourceBaseUrl;
            console.log('[DocsUnlocked LWC] Resource URLs - docsUnlocked:', docsUnlockedUrl, ', content base:', contentResourceBaseUrl);

            // Only set up static resource tree method if NOT using Git provider
            if (!this.docSourceName || !this.docsContent) {
                window.DOCS_GET_TREE_JSON = async (resourceName) => {
                    try {
                        const result = await getTreeAsJson({ resourceName: resourceName });
                        return result;
                    } catch (error) {
                        console.error('[DocsUnlocked LWC] Error calling getTreeAsJson: ' + (error?.message || String(error)));
                        throw error;
                    }
                };
                
                // Expose file content fetching via Apex (works in Experience Cloud)
                window.DOCS_GET_FILE_CONTENT = async (resourceName, filePath) => {
                    try {
                        const result = await getFileContent({ resourceName: resourceName, filePath: filePath });
                        return result;
                    } catch (error) {
                        console.error('[DocsUnlocked LWC] Error calling getFileContent: ' + (error?.message || String(error)));
                        throw error;
                    }
                };
            }

            // Expose permission checking methods
            window.DOCS_CHECK_PERMISSION = async (permissionName) => {
                try {
                    return await hasPermission({ permissionName: permissionName });
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking permission: ' + (error?.message || String(error)));
                    return false;
                }
            };

            window.DOCS_CHECK_CUSTOM_PERMISSION = async (permissionName) => {
                try {
                    return await hasCustomPermission({ permissionName: permissionName });
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking custom permission: ' + (error?.message || String(error)));
                    return false;
                }
            };

            window.DOCS_CHECK_PERMISSION_SET = async (permissionSetName) => {
                try {
                    return await hasPermissionSet({ permissionSetName: permissionSetName });
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking permission set: ' + (error?.message || String(error)));
                    return false;
                }
            };

            window.DOCS_CHECK_PROFILE = async (profileName) => {
                try {
                    return await hasProfile({ profileName: profileName });
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking profile: ' + (error?.message || String(error)));
                    return false;
                }
            };

            window.DOCS_CHECK_OBJECT_ACCESS = async (objectName, accessType) => {
                try {
                    return await hasObjectAccess({ objectName: objectName, accessType: accessType });
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking object access: ' + (error?.message || String(error)));
                    return false;
                }
            };

            window.DOCS_CHECK_FIELD_ACCESS = async (fieldName) => {
                try {
                    return await hasFieldAccess({ fieldName: fieldName });
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking field access: ' + (error?.message || String(error)));
                    return false;
                }
            };

            // Expose flow rendering method
            window.DOCS_RENDER_FLOW = (containerId, flowName, inputVariables, statusCallback, mode = 'inline', dimensions = { width: '100%', height: '400px' }) => {
                try {
                    const flowContainer = this.template.querySelector('#' + containerId) ||
                        document.getElementById(containerId) ||
                        this.template.querySelector('[id="' + containerId + '"]');

                    if (!flowContainer) {
                        console.error('[DocsUnlocked LWC] Flow container not found: ' + containerId);
                        if (statusCallback) {
                            statusCallback({ status: 'ERROR', flowName: flowName, errorMessage: 'Container not found' });
                        }
                        return null;
                    }

                    if (mode === 'inline') {
                        this.showInlineFlow(flowContainer, containerId, flowName, inputVariables, statusCallback, dimensions);
                    } else {
                        this.createFlowLauncher(flowContainer, flowName, inputVariables, statusCallback);
                    }

                    return () => {
                        if (mode === 'inline') {
                            this.hideInlineFlow();
                        }
                    };
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error rendering flow: ' + (error?.message || String(error)));
                    if (statusCallback) {
                        statusCallback({ status: 'ERROR', flowName: flowName, errorMessage: error?.message || 'Unknown error' });
                    }
                    return null;
                }
            };

            this._navigationMixin = this[NavigationMixin.Navigate];

            console.log('[DocsUnlocked LWC] Loading script bundle...');
            await loadScript(this, DOCS_UNLOCKED);

            await new Promise(resolve => setTimeout(resolve, 100));

            if (window.initDocsApp && typeof window.initDocsApp === 'function') {
                window.initDocsApp(container);
            } else if (window.DocsUnlocked && window.DocsUnlocked.initDocsApp) {
                window.DocsUnlocked.initDocsApp(container);
            } else {
                throw new Error('initDocsApp function not found on window or window.DocsUnlocked');
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            const childCount = container.children ? container.children.length : 0;
            if (childCount === 0) {
                console.warn('[DocsUnlocked LWC] Container still empty after initDocsApp call');
            } else {
                console.log('[DocsUnlocked LWC] App initialized successfully (' + childCount + ' children)');
            }
        } catch (error) {
            const errorMessage = error?.message || String(error) || 'Unknown error';
            const errorStack = error?.stack || '';
            console.error('[DocsUnlocked LWC] Error loading: ' + errorMessage);
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
                    ${stack ? `<pre style="text-align: left; background: #f4f4f4; padding: 1rem; border-radius: 4px; font-size: 0.75rem; overflow-x: auto;">${this.escapeHtml(stack.substring(0, 500))}</pre>` : ''}
                    <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">Check the browser console for details.</p>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== Flow Methods ====================

    createFlowLauncher(container, flowName, inputVariables, statusCallback) {
        container.innerHTML = '';
        container.className = 'flow-launcher-container';

        const launcher = document.createElement('div');
        launcher.className = 'slds-card slds-card_boundary';
        launcher.style.cssText = 'margin: 1rem 0; border: 1px solid #d8dde6; border-radius: 0.5rem; overflow: hidden;';

        const header = document.createElement('div');
        header.className = 'slds-card__header slds-grid';
        header.style.cssText = 'background: linear-gradient(135deg, #0070d2 0%, #1b5297 100%); padding: 1rem; color: white;';
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <svg style="width: 24px; height: 24px; fill: white;" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600;">Screen Flow</h3>
                    <p style="margin: 0; font-size: 0.875rem; opacity: 0.9;">${this.escapeHtml(flowName)}</p>
                </div>
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'slds-card__body slds-card__body_inner';
        body.style.cssText = 'padding: 1rem;';

        if (inputVariables && inputVariables.length > 0) {
            const inputsHtml = inputVariables.map(input => `
                <tr>
                    <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 0.875rem;">${this.escapeHtml(input.name)}</td>
                    <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">${this.escapeHtml(input.type)}</td>
                    <td style="padding: 0.5rem; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 0.875rem;">${this.escapeHtml(String(input.value))}</td>
                </tr>
            `).join('');

            body.innerHTML = `
                <p style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Input Variables</p>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
                    <thead><tr style="background: #f9fafb;">
                        <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Name</th>
                        <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Type</th>
                        <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Value</th>
                    </tr></thead>
                    <tbody>${inputsHtml}</tbody>
                </table>
            `;
        } else {
            body.innerHTML = '<p style="color: #6b7280; font-size: 0.875rem; margin: 0;">This flow does not require any input variables.</p>';
        }

        const footer = document.createElement('div');
        footer.className = 'slds-card__footer';
        footer.style.cssText = 'padding: 1rem; background: #f9fafb; border-top: 1px solid #e5e7eb;';

        const launchButton = document.createElement('button');
        launchButton.className = 'slds-button slds-button_brand';
        launchButton.style.cssText = 'background: #0070d2; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;';
        launchButton.innerHTML = `<svg style="width: 20px; height: 20px; fill: currentColor;" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg> Launch Flow`;

        launchButton.addEventListener('click', () => {
            this.launchFlow(flowName, inputVariables, statusCallback, container);
        });

        footer.appendChild(launchButton);
        launcher.appendChild(header);
        launcher.appendChild(body);
        launcher.appendChild(footer);
        container.appendChild(launcher);
    }

    launchFlow(flowName, inputVariables, statusCallback) {
        if (statusCallback) {
            statusCallback({ status: 'STARTED', flowName: flowName });
        }

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/flow/' + flowName + '?' + this.buildFlowQueryString(inputVariables)
            }
        }).catch(error => {
            try {
                window.open('/flow/' + flowName + '?' + this.buildFlowQueryString(inputVariables), '_blank');
            } catch (fallbackError) {
                if (statusCallback) {
                    statusCallback({ status: 'ERROR', flowName: flowName, errorMessage: 'Failed to launch flow' });
                }
            }
        });
    }

    buildFlowQueryString(inputVariables) {
        if (!inputVariables || inputVariables.length === 0) return '';
        return inputVariables.map(input => encodeURIComponent(input.name) + '=' + encodeURIComponent(String(input.value))).join('&');
    }

    showInlineFlow(container, containerId, flowName, inputVariables, statusCallback, dimensions = { width: '100%', height: '400px' }) {
        const queryString = this.buildFlowQueryString(inputVariables || []);
        const flowUrl = '/flow/' + flowName + (queryString ? '?' + queryString : '');

        container.innerHTML = '';
        container.className = 'flow-inline-container';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: relative; width: ' + dimensions.width + '; margin: 1rem 0;';

        const iframe = document.createElement('iframe');
        iframe.src = flowUrl;
        iframe.style.cssText = 'width: 100%; height: ' + dimensions.height + '; min-height: 150px; border: 1px solid #d8dde6; border-radius: 0.5rem; background: white;';
        iframe.title = flowName;
        iframe.setAttribute('frameborder', '0');

        iframe.onload = () => {
            if (statusCallback) {
                statusCallback({ status: 'STARTED', flowName: flowName });
            }
        };

        wrapper.appendChild(iframe);
        container.appendChild(wrapper);

        this._activeFlowIframe = iframe;
        this._activeFlowCallback = statusCallback;
        this.hasActiveFlow = true;
    }

    hideInlineFlow() {
        if (this._activeFlowIframe) {
            this._activeFlowIframe.remove();
            this._activeFlowIframe = null;
        }
        this.hasActiveFlow = false;
        this._activeFlowCallback = null;
    }
}
