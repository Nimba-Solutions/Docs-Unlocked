/**
 * Hook to render Mermaid diagrams in mermaid-placeholder elements
 * 
 * Mermaid.js is bundled directly to ensure compatibility with Salesforce
 * Locker Service and CSP restrictions.
 */

import { useEffect, RefObject, useRef } from 'react';
import mermaid from 'mermaid';
import { unescapeFromDataAttribute, detectDiagramType } from '../utils/mermaidProcessing';

/** Track initialization state */
let isInitialized = false;

/**
 * Initialize mermaid with configuration
 * Only runs once per page load
 */
function initializeMermaid(): void {
    if (isInitialized) return;

    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        logLevel: 'error' as any,
        flowchart: {
            htmlLabels: false, // Use SVG text instead of foreignObject for Locker Service compatibility
            curve: 'basis'
        },
        sequence: {
            useMaxWidth: true
        }
    });

    isInitialized = true;
    console.log('[DocsUnlocked] Mermaid initialized');
}

/**
 * Hook to handle mermaid placeholder rendering
 * 
 * Looks for elements with class "mermaid-placeholder" and renders
 * mermaid diagrams into them.
 */
export const useMermaidEffects = (
    contentRef: RefObject<HTMLElement>,
    html: string
): void => {
    // Track rendered diagrams to avoid re-rendering
    const renderedDiagramsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!contentRef.current || !html) return;

        const controller = new AbortController();
        
        // Clear rendered diagrams set when content changes
        renderedDiagramsRef.current.clear();

        // Initialize mermaid on first use
        initializeMermaid();

        // Delay to ensure DOM is fully updated
        const timeoutId = setTimeout(async () => {
            if (!contentRef.current || controller.signal.aborted) return;

            const placeholders = contentRef.current.querySelectorAll('.mermaid-placeholder');
            
            if (placeholders.length === 0) return;

            console.log(`[DocsUnlocked] Found ${placeholders.length} mermaid placeholder(s)`);

            // Process each placeholder
            for (const placeholder of Array.from(placeholders)) {
                if (controller.signal.aborted) break;

                const element = placeholder as HTMLElement;
                const diagramId = element.getAttribute('data-mermaid-id');
                let definition: string | null = null;
                
                // Try base64 attribute first (most reliable, survives DOMPurify)
                const base64Definition = element.getAttribute('data-mermaid-base64');
                if (base64Definition) {
                    try {
                        definition = decodeURIComponent(escape(atob(base64Definition)));
                    } catch (e) {
                        console.warn('[DocsUnlocked] Failed to decode base64 mermaid definition');
                    }
                }
                
                // Fallback to escaped data attribute
                if (!definition) {
                    const encodedDefinition = element.getAttribute('data-mermaid-definition');
                    if (encodedDefinition) {
                        definition = unescapeFromDataAttribute(encodedDefinition);
                    }
                }

                if (!diagramId || !definition) {
                    console.warn('[DocsUnlocked] Mermaid placeholder missing definition - diagramId: ' + diagramId);
                    renderMermaidError(element, 'Missing diagram definition');
                    continue;
                }

                // Skip if already rendered
                if (renderedDiagramsRef.current.has(diagramId)) {
                    continue;
                }
                const diagramType = detectDiagramType(definition);

                try {
                    await renderMermaidDiagram(element, diagramId, definition, diagramType);
                    renderedDiagramsRef.current.add(diagramId);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error('[DocsUnlocked] Error rendering mermaid diagram: ' + errorMsg);
                    renderMermaidError(
                        element, 
                        errorMsg,
                        definition
                    );
                }
            }
        }, 100);

        return () => {
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [contentRef, html]);
};

/**
 * Render a mermaid diagram into the placeholder element
 */
async function renderMermaidDiagram(
    element: HTMLElement,
    diagramId: string,
    definition: string,
    diagramType: string
): Promise<void> {
    // Create a unique render ID to avoid conflicts
    const renderId = `mermaid-render-${diagramId}`;
    
    try {
        // Use mermaid's render API
        const { svg } = await mermaid.render(renderId, definition);
        
        // Update element with rendered SVG
        element.className = `mermaid-diagram mermaid-type-${diagramType}`;
        element.innerHTML = `
            <div class="mermaid-container bg-white border border-gray-200 rounded-lg p-4 my-4 overflow-x-auto">
                <div class="mermaid-svg flex justify-center">
                    ${svg}
                </div>
            </div>
        `;
        
        // Make SVG responsive
        const svgElement = element.querySelector('svg');
        if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
        }

        console.log(`[DocsUnlocked] Rendered mermaid diagram: ${diagramId} (${diagramType})`);
    } catch (error) {
        throw error;
    }
}

/**
 * Render an error state for the mermaid container
 */
function renderMermaidError(
    element: HTMLElement, 
    message: string,
    definition?: string
): void {
    element.className = 'mermaid-error';
    element.innerHTML = `
        <div class="mermaid-error-container bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <div class="flex-1">
                    <h4 class="text-red-800 font-semibold m-0">Mermaid Diagram Error</h4>
                    <p class="text-red-700 text-sm m-0 mt-1">${escapeHtml(message)}</p>
                    ${definition ? `
                        <details class="mt-3">
                            <summary class="text-sm text-red-600 cursor-pointer hover:text-red-800">Show diagram source</summary>
                            <pre class="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto">${escapeHtml(definition)}</pre>
                        </details>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
