import { LightningElement, api, track } from 'lwc';
import getDocsContentByApp from '@salesforce/apex/GitHubController.getDocsContentByApp';
import getConfigurationByApp from '@salesforce/apex/GitHubController.getConfigurationByApp';
import getVersionOptionsByApp from '@salesforce/apex/GitHubController.getVersionOptionsByApp';

/**
 * Wrapper component that loads documentation from a configured Git provider (GitHub).
 * If no configuration exists for the app, falls back to static resource mode.
 */
export default class DocsUnlockedGit extends LightningElement {
    @api appIdentifier;
    @api fallbackResourceName = 'docsContent'; // Fallback static resource if no config
    @api displayHeader = false;
    @api headerLabel = 'Documentation';
    @api displayFooter = false;

    @track isLoading = true;
    @track hasError = false;
    @track errorMessage = '';
    @track useStaticResource = false;
    @track docsContent = null;
    @track config = null;
    @track versionOptions = null;
    @track selectedRef = null;

    _initialized = false;

    connectedCallback() {
        if (!this._initialized) {
            this._initialized = true;
            this.loadConfiguration();
        }
    }

    async loadConfiguration() {
        if (!this.appIdentifier) {
            // No app identifier - fall back to static resource
            console.log('[DocsUnlockedGit] No appIdentifier provided, using static resource fallback');
            this.useStaticResource = true;
            this.isLoading = false;
            return;
        }

        try {
            // Check if there's a Doc_Source__c configured for this app
            const config = await getConfigurationByApp({ appIdentifier: this.appIdentifier });

            if (!config) {
                // No config found - fall back to static resource
                console.log('[DocsUnlockedGit] No configuration found for app: ' + this.appIdentifier + ', using static resource fallback');
                this.useStaticResource = true;
                this.isLoading = false;
                return;
            }

            this.config = config;
            this.selectedRef = config.defaultRef;
            console.log('[DocsUnlockedGit] Found configuration for app: ' + this.appIdentifier + ', provider: ' + config.provider);

            // Load version options if version switching is allowed
            if (config.allowVersionSwitching) {
                try {
                    this.versionOptions = await getVersionOptionsByApp({ appIdentifier: this.appIdentifier });
                } catch (e) {
                    console.warn('[DocsUnlockedGit] Failed to load version options: ' + e.message);
                }
            }

            // Load the docs content
            await this.loadDocsContent();

        } catch (error) {
            console.error('[DocsUnlockedGit] Error loading configuration: ' + (error.body?.message || error.message || error));
            this.hasError = true;
            this.errorMessage = error.body?.message || error.message || 'Failed to load configuration';
            this.isLoading = false;
        }
    }

    async loadDocsContent() {
        try {
            this.isLoading = true;
            
            const content = await getDocsContentByApp({ 
                appIdentifier: this.appIdentifier, 
                ref: this.selectedRef 
            });

            this.docsContent = content;
            
            // Set up window globals for the React app
            this.setupWindowGlobals();
            
            this.isLoading = false;
            console.log('[DocsUnlockedGit] Loaded ' + content.files.length + ' files from ' + this.config.provider);

        } catch (error) {
            console.error('[DocsUnlockedGit] Error loading docs content: ' + (error.body?.message || error.message || error));
            this.hasError = true;
            this.errorMessage = error.body?.message || error.message || 'Failed to load documentation content';
            this.isLoading = false;
        }
    }

    setupWindowGlobals() {
        // Convert DocsContent to the format expected by the React app
        // The React app expects a tree structure and individual file fetching
        // We're pre-loading everything, so we provide the content directly
        
        const content = this.docsContent;
        
        // Build a manifest/tree structure from the files
        const manifest = this.buildManifest(content.files);
        
        // Store preloaded content so React app can access it
        window.DOCS_PRELOADED_CONTENT = {
            manifest: manifest,
            files: content.files.reduce((acc, file) => {
                // Key by relative path for easy lookup
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

        // Expose version switching capability
        if (this.versionOptions && this.config.allowVersionSwitching) {
            window.DOCS_VERSION_OPTIONS = this.versionOptions;
            window.DOCS_SWITCH_VERSION = async (newRef) => {
                this.selectedRef = newRef;
                await this.loadDocsContent();
                // Trigger React app refresh
                if (window.DOCS_REFRESH) {
                    window.DOCS_REFRESH();
                }
            };
        }
    }

    buildManifest(files) {
        // Build a tree structure from flat file list
        // Expected format matches what StaticResourceTree returns
        const root = {
            name: 'content',
            path: 'content',
            type: 'tree',
            children: []
        };

        for (const file of files) {
            const parts = file.relativePath.split('/');
            let current = root;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLast = i === parts.length - 1;
                const currentPath = parts.slice(0, i + 1).join('/');

                if (isLast) {
                    // It's a file
                    current.children.push({
                        name: part,
                        path: 'content/' + file.relativePath,
                        type: 'blob'
                    });
                } else {
                    // It's a directory - find or create
                    let dir = current.children.find(c => c.name === part && c.type === 'tree');
                    if (!dir) {
                        dir = {
                            name: part,
                            path: 'content/' + currentPath,
                            type: 'tree',
                            children: []
                        };
                        current.children.push(dir);
                    }
                    current = dir;
                }
            }
        }

        // Sort children at each level
        this.sortTree(root);

        return root;
    }

    sortTree(node) {
        if (node.children) {
            // Sort: directories first, then files, alphabetically
            node.children.sort((a, b) => {
                if (a.type === 'tree' && b.type !== 'tree') return -1;
                if (a.type !== 'tree' && b.type === 'tree') return 1;
                return a.name.localeCompare(b.name);
            });
            // Recursively sort children
            for (const child of node.children) {
                this.sortTree(child);
            }
        }
    }

    handleRefChange(event) {
        const newRef = event.target.value;
        if (newRef !== this.selectedRef) {
            this.selectedRef = newRef;
            this.loadDocsContent();
        }
    }

    get showVersionSelector() {
        return this.config?.allowVersionSwitching && this.versionOptions;
    }

    get versionPicklistOptions() {
        if (!this.versionOptions) return [];
        
        const options = [];
        
        // Add branches
        if (this.versionOptions.branches?.length > 0) {
            for (const branch of this.versionOptions.branches) {
                options.push({
                    label: 'Branch: ' + branch.name,
                    value: branch.name,
                    group: 'Branches'
                });
            }
        }
        
        // Add releases
        if (this.versionOptions.releases?.length > 0) {
            for (const release of this.versionOptions.releases) {
                options.push({
                    label: 'Release: ' + release.name,
                    value: release.tagName,
                    group: 'Releases'
                });
            }
        }
        
        // Add tags (excluding those already in releases)
        if (this.versionOptions.tags?.length > 0) {
            const releaseTagNames = (this.versionOptions.releases || []).map(r => r.tagName);
            for (const tag of this.versionOptions.tags) {
                if (!releaseTagNames.includes(tag.name)) {
                    options.push({
                        label: 'Tag: ' + tag.name,
                        value: tag.name,
                        group: 'Tags'
                    });
                }
            }
        }
        
        return options;
    }
}
