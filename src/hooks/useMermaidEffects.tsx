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
 * 
 * IMPORTANT: htmlLabels MUST be false for Salesforce Locker Service compatibility.
 * When htmlLabels is true, Mermaid uses foreignObject with HTML div/span elements
 * for labels, but Locker Service strips or blocks this HTML content.
 * With htmlLabels: false, Mermaid uses native SVG <text> elements which work correctly.
 */
function initializeMermaid(): void {
    if (isInitialized) return;

    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Arial, Helvetica, sans-serif',
        logLevel: 'error' as any,
        // Flowcharts - MUST use htmlLabels: false for Salesforce
        flowchart: {
            htmlLabels: false,  // Use SVG text, not foreignObject HTML
            curve: 'basis',
            padding: 15,
            nodeSpacing: 50,
            rankSpacing: 50,
            useMaxWidth: true
        },
        // Sequence diagrams - these already use SVG text by default
        sequence: {
            useMaxWidth: true,
            actorFontFamily: 'Arial, Helvetica, sans-serif',
            messageFontFamily: 'Arial, Helvetica, sans-serif',
            noteFontFamily: 'Arial, Helvetica, sans-serif'
        },
        // State diagrams - use SVG text
        state: {
            useMaxWidth: true
        },
        // ER diagrams - use SVG text
        er: {
            useMaxWidth: true
        },
        // Gantt charts - increase size and ensure labels show
        gantt: {
            useMaxWidth: false,  // Allow chart to be larger
            leftPadding: 100,
            gridLineStartPadding: 35,
            barHeight: 30,
            barGap: 8,
            topPadding: 50,
            sectionFontSize: 14,
            numberSectionStyles: 4,
            axisFormat: '%Y-%m-%d'
        },
        // Pie charts - already work, but ensure font settings
        pie: {
            useMaxWidth: true,
            textPosition: 0.75
        }
    });

    isInitialized = true;
    console.log('[DocsUnlocked] Mermaid initialized with htmlLabels:false for Locker Service compatibility');
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
 * Extract text content from foreignObjects before Salesforce strips them.
 * Returns a map keyed by parent element ID or a generated key.
 * 
 * The SVG itself passes through unchanged - we add labels via DOM after render.
 */
function extractForeignObjectLabels(svgString: string): Map<string, string> {
    const labels = new Map<string, string>();
    
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.documentElement;
        
        // Find all foreignObject elements and extract their text + parent info
        const foreignObjects = svg.querySelectorAll('foreignObject');
        
        let foIndex = 0;
        foreignObjects.forEach((fo) => {
            // Extract text content
            let textContent = '';
            const divs = fo.querySelectorAll('div, span, p');
            if (divs.length > 0) {
                divs.forEach((div) => {
                    const text = div.textContent?.trim();
                    if (text) {
                        textContent += (textContent ? ' ' : '') + text;
                    }
                });
            } else {
                textContent = fo.textContent?.trim() || '';
            }
            
            if (textContent) {
                // Try to find parent with ID (flowchart nodes, state nodes, etc.)
                const parentWithId = fo.closest('[id]');
                if (parentWithId && parentWithId.id) {
                    labels.set(parentWithId.id, textContent);
                } else {
                    // Use index-based key as fallback
                    labels.set(`fo-${foIndex}`, textContent);
                }
            }
            foIndex++;
        });
    } catch (e) {
        console.warn('[DocsUnlocked] Failed to extract foreignObject labels');
    }
    
    return labels;
}

/**
 * Extract node labels from a Mermaid definition
 * Returns a map of nodeId -> label text
 */
function extractLabelsFromDefinition(definition: string): Map<string, string> {
    const labels = new Map<string, string>();
    
    // Match patterns like: A[Label] or B(Label) or C{Label} or D([Label]) or E[[Label]] etc
    // Also handles: A[Label Text] --> B[Other Label]
    const nodePattern = /([A-Za-z0-9_]+)\s*(\[{1,2}|\({1,2}|\{{1,2}|>\[|\[\(|\[\/)([^\]\)\}]+)(\]{1,2}|\){1,2}|\}{1,2}|\]>|\)\]|\/\])/g;
    
    let match;
    while ((match = nodePattern.exec(definition)) !== null) {
        const nodeId = match[1];
        const label = match[3].trim();
        if (label) {
            labels.set(nodeId, label);
        }
    }
    
    return labels;
}

/**
 * Parse ER diagram definition to extract entity names and their attributes
 */
interface ErEntity {
    name: string;
    attributes: Array<{ type: string; name: string }>;
}

function parseErDiagram(definition: string): Map<string, ErEntity> {
    const entities = new Map<string, ErEntity>();
    
    // First, find all entity names from relationships
    // Pattern: EntityA ||--o{ EntityB : relationship
    const relationshipPattern = /([A-Za-z0-9_]+)\s*\|.*\|\s*([A-Za-z0-9_]+)\s*:/g;
    let relMatch;
    while ((relMatch = relationshipPattern.exec(definition)) !== null) {
        const entity1 = relMatch[1];
        const entity2 = relMatch[2];
        if (!entities.has(entity1)) {
            entities.set(entity1, { name: entity1, attributes: [] });
        }
        if (!entities.has(entity2)) {
            entities.set(entity2, { name: entity2, attributes: [] });
        }
    }
    
    // Then, parse entity attribute blocks
    // Pattern: EntityName { type attr1 type attr2 ... }
    const entityBlockPattern = /([A-Za-z0-9_]+)\s*\{([^}]+)\}/g;
    let blockMatch;
    while ((blockMatch = entityBlockPattern.exec(definition)) !== null) {
        const entityName = blockMatch[1];
        const attributesBlock = blockMatch[2];
        
        // Parse individual attributes: "type name" on each line
        const attrPattern = /([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)/g;
        const attributes: Array<{ type: string; name: string }> = [];
        let attrMatch;
        while ((attrMatch = attrPattern.exec(attributesBlock)) !== null) {
            attributes.push({
                type: attrMatch[1],
                name: attrMatch[2]
            });
        }
        
        entities.set(entityName, { name: entityName, attributes });
    }
    
    return entities;
}


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
        
        // Extract labels from foreignObjects BEFORE Salesforce strips them
        // We don't modify the SVG - just capture the labels for later
        const foreignObjectLabels = extractForeignObjectLabels(svg);
        
        // Also extract labels from the definition syntax as backup
        const definitionLabels = extractLabelsFromDefinition(definition);
        
        // Update element with the UNMODIFIED SVG
        // Let Mermaid's styling stay intact
        element.className = `mermaid-diagram mermaid-type-${diagramType}`;
        element.innerHTML = `
            <div class="mermaid-container bg-white border border-gray-200 rounded-lg p-4 my-4 overflow-x-auto">
                <div class="mermaid-svg flex justify-center">
                    ${svg}
                </div>
            </div>
        `;
        
        // Now work with the DOM-inserted SVG
        const svgElement = element.querySelector('svg');
        if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
            
            // For Gantt charts, set a minimum width to prevent compression
            if (diagramType === 'gantt') {
                svgElement.style.minWidth = '800px';
            }
            
            // Find elements that are missing their labels (foreignObject was stripped)
            // and add SVG text elements with the extracted labels
            
            // 1. Handle flowchart nodes
            const nodes = svgElement.querySelectorAll('.node');
            nodes.forEach((node) => {
                const nodeId = node.id;
                const labelGroup = node.querySelector('g.label');
                
                if (labelGroup) {
                    const existingText = labelGroup.querySelector('text');
                    const hasForeignObject = labelGroup.querySelector('foreignObject');
                    
                    if (!existingText && !hasForeignObject) {
                        let labelText = foreignObjectLabels.get(nodeId);
                        
                        if (!labelText) {
                            const nodeIdMatch = nodeId.match(/flowchart-([A-Za-z0-9_]+)-\d+/);
                            if (nodeIdMatch) {
                                labelText = definitionLabels.get(nodeIdMatch[1]);
                            }
                        }
                        
                        if (labelText) {
                            const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                            textEl.setAttribute('x', '0');
                            textEl.setAttribute('y', '0');
                            textEl.setAttribute('text-anchor', 'middle');
                            textEl.setAttribute('dominant-baseline', 'middle');
                            textEl.setAttribute('fill', '#333');
                            textEl.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
                            textEl.setAttribute('font-size', '14');
                            textEl.textContent = labelText;
                            labelGroup.appendChild(textEl);
                        }
                    }
                }
            });
            
            // 2. Handle state diagram states
            if (diagramType === 'state') {
                const stateNodes = svgElement.querySelectorAll('[id^="state-"], .statediagram-state, .stateGroup');
                stateNodes.forEach((stateNode) => {
                    const stateId = stateNode.id || (stateNode as Element).getAttribute('id');
                    if (!stateId) return;
                    
                    const labelGroup = stateNode.querySelector('g.label');
                    
                    if (labelGroup) {
                        const existingText = labelGroup.querySelector('text');
                        const hasForeignObject = labelGroup.querySelector('foreignObject');
                        
                        if (!existingText && !hasForeignObject) {
                            let labelText = foreignObjectLabels.get(stateId);
                            
                            // Try to extract state name from ID (e.g., "state-Draft-0" -> "Draft")
                            if (!labelText) {
                                const stateMatch = stateId.match(/state-([A-Za-z0-9_]+)/);
                                if (stateMatch) {
                                    labelText = stateMatch[1];
                                }
                            }
                            
                            if (labelText) {
                                const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                                textEl.setAttribute('x', '0');
                                textEl.setAttribute('y', '0');
                                textEl.setAttribute('text-anchor', 'middle');
                                textEl.setAttribute('dominant-baseline', 'middle');
                                textEl.setAttribute('fill', '#333');
                                textEl.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
                                textEl.setAttribute('font-size', '14');
                                textEl.textContent = labelText;
                                labelGroup.appendChild(textEl);
                            }
                        }
                    }
                });
            }
            
            // 3. Handle ER diagram entities
            if (diagramType === 'er') {
                const erEntities = parseErDiagram(definition);
                
                // Find all entity nodes in the SVG
                const entityNodes = svgElement.querySelectorAll('[id^="entity-"]');
                entityNodes.forEach((entityNode) => {
                    const entityId = entityNode.id;
                    const entityMatch = entityId.match(/entity-([A-Za-z0-9_]+)-\d+/);
                    if (!entityMatch) return;
                    
                    const entityName = entityMatch[1];
                    const entityData = erEntities.get(entityName);
                    
                    // Fill in entity name label
                    const nameLabel = entityNode.querySelector('g.label.name');
                    if (nameLabel && !nameLabel.querySelector('text')) {
                        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        textEl.setAttribute('text-anchor', 'middle');
                        textEl.setAttribute('dominant-baseline', 'middle');
                        textEl.setAttribute('fill', '#333');
                        textEl.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
                        textEl.setAttribute('font-size', '14');
                        textEl.setAttribute('font-weight', 'bold');
                        textEl.textContent = entityName;
                        nameLabel.appendChild(textEl);
                    }
                    
                    // Fill in attribute labels if entity has attributes
                    if (entityData && entityData.attributes.length > 0) {
                        const attrTypes = entityNode.querySelectorAll('g.label.attribute-type');
                        const attrNames = entityNode.querySelectorAll('g.label.attribute-name');
                        
                        entityData.attributes.forEach((attr, idx) => {
                            // Fill attribute type
                            if (attrTypes[idx] && !attrTypes[idx].querySelector('text')) {
                                const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                                typeText.setAttribute('text-anchor', 'start');
                                typeText.setAttribute('dominant-baseline', 'middle');
                                typeText.setAttribute('fill', '#333');
                                typeText.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
                                typeText.setAttribute('font-size', '12');
                                typeText.textContent = attr.type;
                                attrTypes[idx].appendChild(typeText);
                            }
                            
                            // Fill attribute name
                            if (attrNames[idx] && !attrNames[idx].querySelector('text')) {
                                const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                                nameText.setAttribute('text-anchor', 'start');
                                nameText.setAttribute('dominant-baseline', 'middle');
                                nameText.setAttribute('fill', '#333');
                                nameText.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
                                nameText.setAttribute('font-size', '12');
                                nameText.textContent = attr.name;
                                attrNames[idx].appendChild(nameText);
                            }
                        });
                    }
                    
                    // For simple entities without attributes, add entity name if missing
                    const simpleLabel = entityNode.querySelector('g.label:not(.name):not(.attribute-type):not(.attribute-name):not(.attribute-keys):not(.attribute-comment)');
                    if (simpleLabel && !entityNode.querySelector('text.er.entityLabel')) {
                        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        textEl.setAttribute('x', '0');
                        textEl.setAttribute('y', '0');
                        textEl.setAttribute('text-anchor', 'middle');
                        textEl.setAttribute('dominant-baseline', 'middle');
                        textEl.setAttribute('fill', '#333');
                        textEl.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
                        textEl.setAttribute('font-size', '12');
                        textEl.setAttribute('class', 'er entityLabel');
                        textEl.textContent = entityName;
                        entityNode.appendChild(textEl);
                    }
                });
            }
            
            // 4. Also try a generic approach - find any g.label missing text
            const allLabelGroups = svgElement.querySelectorAll('g.label');
            allLabelGroups.forEach((labelGroup, index) => {
                const existingText = labelGroup.querySelector('text');
                const hasForeignObject = labelGroup.querySelector('foreignObject');
                
                if (!existingText && !hasForeignObject) {
                    // Try to find label from our extracted map using parent ID
                    const parentWithId = labelGroup.closest('[id]');
                    const parentId = parentWithId?.id;
                    
                    let labelText = parentId ? foreignObjectLabels.get(parentId) : undefined;
                    
                    // Fallback to index-based lookup
                    if (!labelText) {
                        labelText = foreignObjectLabels.get(`fo-${index}`);
                    }
                    
                    if (labelText) {
                        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        textEl.setAttribute('x', '0');
                        textEl.setAttribute('y', '0');
                        textEl.setAttribute('text-anchor', 'middle');
                        textEl.setAttribute('dominant-baseline', 'middle');
                        textEl.setAttribute('fill', '#333');
                        textEl.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
                        textEl.setAttribute('font-size', '14');
                        textEl.textContent = labelText;
                        labelGroup.appendChild(textEl);
                    }
                }
            });
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
