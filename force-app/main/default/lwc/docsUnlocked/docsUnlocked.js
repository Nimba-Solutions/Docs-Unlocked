import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { NavigationMixin } from 'lightning/navigation';
import getTreeAsJson from '@salesforce/apex/StaticResourceTree.getTreeAsJson';
import hasPermission from '@salesforce/apex/PermissionChecker.hasPermission';
import hasCustomPermission from '@salesforce/apex/PermissionChecker.hasCustomPermission';
import hasPermissionSet from '@salesforce/apex/PermissionChecker.hasPermissionSet';
import hasProfile from '@salesforce/apex/PermissionChecker.hasProfile';
import hasObjectAccess from '@salesforce/apex/PermissionChecker.hasObjectAccess';
import hasFieldAccess from '@salesforce/apex/PermissionChecker.hasFieldAccess';
import DOCS_UNLOCKED from '@salesforce/resourceUrl/docsUnlocked';

export default class DocsUnlocked extends NavigationMixin(LightningElement) {
    @api contentResourceName = 'docsContent'; // Default to docsContent for backward compatibility
    @api displayHeader = false; // LWC requires boolean defaults to false, but we'll treat undefined/null as true
    @api headerLabel = 'Documentation'; // Default header label
    @api displayFooter = false; // LWC requires boolean defaults to false, but we'll treat undefined/null as true

    // Flow embed state
    @track hasActiveFlow = false;
    _activeFlowCallback = null;
    _activeFlowIframe = null;

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
            
            // Set configuration as data attributes so React app can read them
            container.setAttribute('data-content-resource', this.contentResourceName);
            container.setAttribute('data-display-header', this.displayHeader);
            container.setAttribute('data-header-label', this.headerLabel || 'Documentation');
            container.setAttribute('data-display-footer', this.displayFooter);
            
            // Also set on window for React app to access
            // Boolean properties default to true via meta.xml, but LWC requires JS default to false
            window.DOCS_CONTENT_RESOURCE_NAME = this.contentResourceName;
            window.DOCS_DISPLAY_HEADER = this.displayHeader === true;
            window.DOCS_HEADER_LABEL = this.headerLabel || 'Documentation';
            window.DOCS_DISPLAY_FOOTER = this.displayFooter === true;
            
            // Expose method to get tree JSON from Apex
            window.DOCS_GET_TREE_JSON = async (resourceName) => {
                try {
                    const result = await getTreeAsJson({ resourceName: resourceName });
                    return result;
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error calling getTreeAsJson: ' + (error?.message || String(error)));
                    throw error;
                }
            };
            
            // Expose permission checking methods from Apex
            window.DOCS_CHECK_PERMISSION = async (permissionName) => {
                try {
                    const result = await hasPermission({ permissionName: permissionName });
                    return result;
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking permission: ' + (error?.message || String(error)));
                    return false;
                }
            };
            
            window.DOCS_CHECK_CUSTOM_PERMISSION = async (permissionName) => {
                try {
                    const result = await hasCustomPermission({ permissionName: permissionName });
                    return result;
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking custom permission: ' + (error?.message || String(error)));
                    return false;
                }
            };
            
            window.DOCS_CHECK_PERMISSION_SET = async (permissionSetName) => {
                try {
                    const result = await hasPermissionSet({ permissionSetName: permissionSetName });
                    return result;
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking permission set: ' + (error?.message || String(error)));
                    return false;
                }
            };
            
            window.DOCS_CHECK_PROFILE = async (profileName) => {
                try {
                    const result = await hasProfile({ profileName: profileName });
                    return result;
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking profile: ' + (error?.message || String(error)));
                    return false;
                }
            };
            
            window.DOCS_CHECK_OBJECT_ACCESS = async (objectName, accessType) => {
                try {
                    const result = await hasObjectAccess({ objectName: objectName, accessType: accessType });
                    return result;
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking object access: ' + (error?.message || String(error)));
                    return false;
                }
            };
            
            window.DOCS_CHECK_FIELD_ACCESS = async (fieldName) => {
                try {
                    const result = await hasFieldAccess({ fieldName: fieldName });
                    return result;
                } catch (error) {
                    console.error('[DocsUnlocked LWC] Error checking field access: ' + (error?.message || String(error)));
                    return false;
                }
            };
            
            // Expose flow rendering method
            // This creates an interactive flow launcher or inline embed in the documentation
            // mode: 'launcher' - shows a card with Launch button
            // mode: 'inline' (default) - embeds the flow directly
            // dimensions: { width, height } - size of inline embed (default: 100% x 400px)
            window.DOCS_RENDER_FLOW = (containerId, flowName, inputVariables, statusCallback, mode = 'inline', dimensions = { width: '100%', height: '400px' }) => {
                try {
                    console.log('[DocsUnlocked LWC] Rendering flow: ' + flowName + ' in container: ' + containerId + ' mode: ' + mode + ' dimensions: ' + JSON.stringify(dimensions));
                    
                    // Find the container element
                    const container = this.template.querySelector('#' + containerId) || 
                                     document.getElementById(containerId) ||
                                     this.template.querySelector('[id="' + containerId + '"]');
                    
                    if (!container) {
                        console.error('[DocsUnlocked LWC] Flow container not found: ' + containerId);
                        if (statusCallback) {
                            statusCallback({ status: 'ERROR', flowName: flowName, errorMessage: 'Container not found' });
                        }
                        return null;
                    }
                    
                    if (mode === 'inline') {
                        // Inline mode: embed the flow directly using iframe
                        this.showInlineFlow(container, containerId, flowName, inputVariables, statusCallback, dimensions);
                    } else {
                        // Launcher mode: create the flow launcher UI
                        this.createFlowLauncher(container, flowName, inputVariables, statusCallback);
                    }
                    
                    // Return cleanup function
                    return () => {
                        console.log('[DocsUnlocked LWC] Cleaning up flow: ' + flowName);
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
            
            // Store reference for navigation
            this._navigationMixin = this[NavigationMixin.Navigate];
            
            console.log('[DocsUnlocked LWC] Container ID set, content resource: ' + this.contentResourceName + ', loading script bundle...');
            
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

    /**
     * Create an interactive flow launcher UI in the container
     * The launcher shows flow info and a button to launch the flow
     */
    createFlowLauncher(container, flowName, inputVariables, statusCallback) {
        // Clear existing content
        container.innerHTML = '';
        container.className = 'flow-launcher-container';
        
        // Create the launcher card
        const launcher = document.createElement('div');
        launcher.className = 'slds-card slds-card_boundary';
        launcher.style.cssText = 'margin: 1rem 0; border: 1px solid #d8dde6; border-radius: 0.5rem; overflow: hidden;';
        
        // Header
        const header = document.createElement('div');
        header.className = 'slds-card__header slds-grid';
        header.style.cssText = 'background: linear-gradient(135deg, #0070d2 0%, #1b5297 100%); padding: 1rem; color: white;';
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <svg style="width: 24px; height: 24px; fill: white;" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600;">Screen Flow</h3>
                    <p style="margin: 0; font-size: 0.875rem; opacity: 0.9;">${this.escapeHtml(flowName)}</p>
                </div>
            </div>
        `;
        
        // Body
        const body = document.createElement('div');
        body.className = 'slds-card__body slds-card__body_inner';
        body.style.cssText = 'padding: 1rem;';
        
        // Show input variables if any
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
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Name</th>
                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Type</th>
                            <th style="padding: 0.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inputsHtml}
                    </tbody>
                </table>
            `;
        } else {
            body.innerHTML = '<p style="color: #6b7280; font-size: 0.875rem; margin: 0;">This flow does not require any input variables.</p>';
        }
        
        // Footer with launch button
        const footer = document.createElement('div');
        footer.className = 'slds-card__footer';
        footer.style.cssText = 'padding: 1rem; background: #f9fafb; border-top: 1px solid #e5e7eb;';
        
        const launchButton = document.createElement('button');
        launchButton.className = 'slds-button slds-button_brand';
        launchButton.style.cssText = 'background: #0070d2; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;';
        launchButton.innerHTML = `
            <svg style="width: 20px; height: 20px; fill: currentColor;" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
            </svg>
            Launch Flow
        `;
        
        // Add click handler
        launchButton.addEventListener('click', () => {
            this.launchFlow(flowName, inputVariables, statusCallback, container);
        });
        
        footer.appendChild(launchButton);
        
        // Assemble the card
        launcher.appendChild(header);
        launcher.appendChild(body);
        launcher.appendChild(footer);
        container.appendChild(launcher);
    }

    /**
     * Launch the flow using Lightning Navigation
     */
    launchFlow(flowName, inputVariables, statusCallback, container) {
        console.log('[DocsUnlocked LWC] Launching flow: ' + flowName);
        
        if (statusCallback) {
            statusCallback({ status: 'STARTED', flowName: flowName });
        }
        
        // Build input variables object for navigation
        const flowInputVariables = {};
        if (inputVariables && inputVariables.length > 0) {
            inputVariables.forEach(input => {
                flowInputVariables[input.name] = input.value;
            });
        }
        
        // Navigate to the flow
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/flow/' + flowName + '?' + this.buildFlowQueryString(inputVariables)
            }
        }).then(() => {
            console.log('[DocsUnlocked LWC] Flow navigation successful');
        }).catch(error => {
            console.error('[DocsUnlocked LWC] Flow navigation error: ' + (error?.message || String(error)));
            
            // Try alternative navigation method
            try {
                const flowUrl = '/flow/' + flowName + '?' + this.buildFlowQueryString(inputVariables);
                window.open(flowUrl, '_blank');
                
                if (statusCallback) {
                    statusCallback({ status: 'STARTED', flowName: flowName });
                }
            } catch (fallbackError) {
                console.error('[DocsUnlocked LWC] Fallback navigation also failed: ' + (fallbackError?.message || String(fallbackError)));
                if (statusCallback) {
                    statusCallback({ 
                        status: 'ERROR', 
                        flowName: flowName, 
                        errorMessage: 'Failed to launch flow: ' + (error?.message || 'Unknown error')
                    });
                }
            }
        });
    }

    /**
     * Build query string for flow input variables
     */
    buildFlowQueryString(inputVariables) {
        if (!inputVariables || inputVariables.length === 0) {
            return '';
        }
        
        const params = inputVariables.map(input => {
            const encodedName = encodeURIComponent(input.name);
            const encodedValue = encodeURIComponent(String(input.value));
            return encodedName + '=' + encodedValue;
        });
        
        return params.join('&');
    }

    /**
     * Show inline flow embedded at the container location using iframe
     * @param {HTMLElement} container - Container element
     * @param {string} containerId - Container ID
     * @param {string} flowName - Flow API name
     * @param {Array} inputVariables - Input variables for the flow
     * @param {Function} statusCallback - Callback for status updates
     * @param {Object} dimensions - { width, height } for the iframe
     */
    showInlineFlow(container, containerId, flowName, inputVariables, statusCallback, dimensions = { width: '100%', height: '400px' }) {
        console.log('[DocsUnlocked LWC] Showing inline flow: ' + flowName + ' with dimensions: ' + JSON.stringify(dimensions));
        
        // Find all potential scroll containers to restore scroll position
        // This prevents the browser from auto-scrolling when the iframe focuses
        const mainContent = container.closest('.docs-main-content');
        const scrollableMain = container.closest('main');
        const articleParent = container.closest('article')?.parentElement;
        
        // Try multiple containers to find the one that's scrolled
        const scrollContainer = mainContent || articleParent || scrollableMain || 
                               document.scrollingElement || document.documentElement;
        
        // Store scroll positions from all potential containers
        const savedScrollPositions = {
            mainContent: mainContent?.scrollTop || 0,
            scrollableMain: scrollableMain?.scrollTop || 0,
            articleParent: articleParent?.scrollTop || 0,
            window: window.scrollY,
            container: scrollContainer?.scrollTop || 0
        };
        
        console.log('[DocsUnlocked LWC] Saved scroll positions:', JSON.stringify(savedScrollPositions));
        
        // Temporarily disable scrolling on containers to prevent focus-triggered scroll
        // This is more reliable than trying to restore scroll after focus events
        const originalOverflow = {
            mainContent: mainContent?.style.overflow,
            scrollableMain: scrollableMain?.style.overflow,
            body: document.body.style.overflow
        };
        
        const lockScroll = () => {
            if (mainContent) mainContent.style.overflow = 'hidden';
            if (scrollableMain) scrollableMain.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        };
        
        const unlockScroll = () => {
            if (mainContent) mainContent.style.overflow = originalOverflow.mainContent || '';
            if (scrollableMain) scrollableMain.style.overflow = originalOverflow.scrollableMain || '';
            document.body.style.overflow = originalOverflow.body || '';
        };
        
        // Function to restore all scroll positions
        const restoreScrollPositions = () => {
            console.log('[DocsUnlocked LWC] Restoring scroll positions to:', JSON.stringify(savedScrollPositions));
            
            // Restore to all potential scroll containers
            if (mainContent) mainContent.scrollTop = savedScrollPositions.mainContent;
            if (scrollableMain) scrollableMain.scrollTop = savedScrollPositions.scrollableMain;
            if (articleParent) articleParent.scrollTop = savedScrollPositions.articleParent;
            if (scrollContainer) scrollContainer.scrollTop = savedScrollPositions.container;
            window.scrollTo(0, savedScrollPositions.window);
            
            // Also try document scrolling element and body
            if (document.scrollingElement) {
                document.scrollingElement.scrollTop = savedScrollPositions.window;
            }
            if (document.documentElement) {
                document.documentElement.scrollTop = savedScrollPositions.window;
            }
            if (document.body) {
                document.body.scrollTop = savedScrollPositions.window;
            }
        };
        
        // Build the flow URL with input parameters
        const queryString = this.buildFlowQueryString(inputVariables || []);
        const flowUrl = '/flow/' + flowName + (queryString ? '?' + queryString : '');
        
        console.log('[DocsUnlocked LWC] Flow URL: ' + flowUrl);
        
        // Clear the container and insert an iframe
        container.innerHTML = '';
        container.className = 'flow-inline-container';
        
        // Create wrapper for iframe + resize handle
        const wrapper = document.createElement('div');
        wrapper.className = 'flow-iframe-wrapper';
        wrapper.style.cssText = 'position: relative; width: ' + dimensions.width + '; margin: 1rem 0;';
        
        // Create iframe element with specified dimensions
        const iframe = document.createElement('iframe');
        iframe.src = flowUrl;
        iframe.style.cssText = 'width: 100%; height: ' + dimensions.height + '; min-height: 150px; border: 1px solid #d8dde6; border-radius: 0.5rem 0.5rem 0 0; background: white; overflow: hidden; display: block;';
        iframe.title = flowName;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', 'true');
        // Prevent iframe from stealing focus and causing scroll
        iframe.setAttribute('tabindex', '-1');
        
        // Create resize handle for manual adjustment
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'flow-resize-handle';
        resizeHandle.style.cssText = 'width: 100%; height: 12px; background: linear-gradient(to bottom, #e5e7eb, #d1d5db); border: 1px solid #d8dde6; border-top: none; border-radius: 0 0 0.5rem 0.5rem; cursor: ns-resize; display: flex; align-items: center; justify-content: center;';
        resizeHandle.innerHTML = '<div style="width: 40px; height: 4px; background: #9ca3af; border-radius: 2px;"></div>';
        resizeHandle.title = 'Drag to resize';
        
        // Create invisible overlay to capture mouse events during drag
        // This prevents the iframe from stealing mouse events when dragging upward
        const dragOverlay = document.createElement('div');
        dragOverlay.className = 'flow-drag-overlay';
        dragOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; display: none; cursor: ns-resize;';
        
        // Resize handle drag logic
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = iframe.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            // Show overlay to block iframe from capturing mouse events
            dragOverlay.style.display = 'block';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const deltaY = e.clientY - startY;
            const newHeight = Math.max(150, startHeight + deltaY);
            iframe.style.height = newHeight + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                // Hide overlay when done dragging
                dragOverlay.style.display = 'none';
            }
        });
        
        // Handle iframe load
        iframe.onload = () => {
            console.log('[DocsUnlocked LWC] Flow iframe loaded with dimensions: ' + dimensions.width + ' x ' + dimensions.height);
            
            // Restore scroll position to prevent auto-scroll when iframe loads
            // The browser may have scrolled to focus the iframe content
            restoreScrollPositions();
            
            // Also restore after short delays to catch focus-triggered scrolls
            // The flow content may focus input fields after load
            // Use multiple delays to catch all possible focus timing scenarios
            setTimeout(restoreScrollPositions, 50);
            setTimeout(restoreScrollPositions, 100);
            setTimeout(restoreScrollPositions, 200);
            setTimeout(restoreScrollPositions, 500);
            setTimeout(restoreScrollPositions, 750);
            setTimeout(() => {
                restoreScrollPositions();
                // Unlock scroll after all restorations complete
                unlockScroll();
                console.log('[DocsUnlocked LWC] Scroll unlocked after flow load');
            }, 1000);
            setTimeout(restoreScrollPositions, 1500);
            
            if (statusCallback) {
                statusCallback({ status: 'STARTED', flowName: flowName });
            }
        };
        
        iframe.onerror = (error) => {
            console.error('[DocsUnlocked LWC] Flow iframe error: ' + error);
            if (statusCallback) {
                statusCallback({ status: 'ERROR', flowName: flowName, errorMessage: 'Failed to load flow' });
            }
        };
        
        // Lock scroll before DOM insertion to prevent focus-triggered scroll
        lockScroll();
        
        // Assemble wrapper with iframe, overlay, and resize handle
        wrapper.appendChild(iframe);
        wrapper.appendChild(dragOverlay);
        wrapper.appendChild(resizeHandle);
        container.appendChild(wrapper);
        
        // Immediately restore scroll position after DOM insertion
        // This catches any scroll that happens during element addition
        restoreScrollPositions();
        
        // Also restore after short delays to catch any deferred scroll events
        // that might occur as the browser processes the new iframe
        setTimeout(restoreScrollPositions, 10);
        setTimeout(restoreScrollPositions, 50);
        
        // Store reference for cleanup
        this._activeFlowIframe = iframe;
        this._activeFlowCallback = statusCallback;
        this.hasActiveFlow = true;
    }

    /**
     * Hide the inline flow
     */
    hideInlineFlow() {
        console.log('[DocsUnlocked LWC] Hiding inline flow');
        
        if (this._activeFlowIframe) {
            this._activeFlowIframe.remove();
            this._activeFlowIframe = null;
        }
        
        this.hasActiveFlow = false;
        this._activeFlowCallback = null;
    }

}
