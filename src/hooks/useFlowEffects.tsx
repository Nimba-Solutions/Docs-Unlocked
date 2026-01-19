/**
 * Hook to render Salesforce Screen Flows in flow-placeholder elements
 * 
 * Flows are rendered via the LWC component which provides the
 * DOCS_RENDER_FLOW function on the window object.
 */

import { useEffect, RefObject } from 'react';
import { FlowInput, convertToFlowInputVariables } from '../utils/flowProcessing';

/**
 * Flow status callback from Salesforce
 */
export interface FlowStatusEvent {
    status: 'STARTED' | 'PAUSED' | 'FINISHED' | 'FINISHED_SCREEN' | 'ERROR';
    flowName: string;
    outputVariables?: Record<string, unknown>;
    errorMessage?: string;
}

/**
 * Hook to handle flow placeholder rendering
 * 
 * Looks for elements with class "flow-placeholder" and renders
 * Salesforce Screen Flows into them using the LWC bridge.
 */
export const useFlowEffects = (
    contentRef: RefObject<HTMLElement>,
    html: string,
    onFlowStatus?: (event: FlowStatusEvent) => void
): void => {
    useEffect(() => {
        if (!contentRef.current || !html) return;

        const cleanupFunctions: Array<() => void> = [];

        // Small delay to ensure DOM is fully updated
        const timeoutId = setTimeout(() => {
            if (!contentRef.current) return;

            const placeholders = contentRef.current.querySelectorAll('.flow-placeholder');
            
            if (placeholders.length === 0) return;

            console.log(`[DocsUnlocked] Found ${placeholders.length} flow placeholders`);

            placeholders.forEach((placeholder, index) => {
                const element = placeholder as HTMLElement;
                const flowName = element.getAttribute('data-flow-name');
                const inputsJson = element.getAttribute('data-flow-inputs');
                const mode = element.getAttribute('data-flow-mode') || 'inline';

                if (!flowName) {
                    console.warn('[DocsUnlocked] Flow placeholder missing flow name');
                    renderFlowError(element, 'Flow name not specified');
                    return;
                }

                // Parse inputs
                let inputs: FlowInput[] = [];
                if (inputsJson) {
                    try {
                        inputs = JSON.parse(inputsJson.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
                    } catch (e) {
                        console.warn('[DocsUnlocked] Failed to parse flow inputs:', e);
                    }
                }

                const inputVariables = convertToFlowInputVariables(inputs);

                console.log(`[DocsUnlocked] Rendering flow: ${flowName}`, JSON.stringify({ inputs: inputVariables, mode }));

                // Check if we're running in Salesforce with the LWC bridge
                const renderFlow = (window as any).DOCS_RENDER_FLOW;

                if (typeof renderFlow === 'function') {
                    // Running in Salesforce - use LWC to render the flow
                    try {
                        const flowContainerId = `flow-container-${index}-${Date.now()}`;
                        element.id = flowContainerId;
                        element.className = `flow-container flow-mode-${mode}`;

                        // Create flow status handler
                        const statusHandler = (event: FlowStatusEvent) => {
                            console.log(`[DocsUnlocked] Flow status: ${event.status}`, JSON.stringify(event));
                            
                            if (event.status === 'FINISHED' || event.status === 'FINISHED_SCREEN') {
                                // Flow completed - could show completion message
                                handleFlowCompletion(element, event);
                            } else if (event.status === 'ERROR') {
                                renderFlowError(element, event.errorMessage || 'Flow encountered an error');
                            }
                            
                            if (onFlowStatus) {
                                onFlowStatus(event);
                            }
                        };

                        // Call LWC to render the flow with mode
                        const cleanup = renderFlow(flowContainerId, flowName, inputVariables, statusHandler, mode);
                        
                        if (typeof cleanup === 'function') {
                            cleanupFunctions.push(cleanup);
                        }
                    } catch (error) {
                        console.error('[DocsUnlocked] Error rendering flow:', error);
                        renderFlowError(element, error instanceof Error ? error.message : 'Failed to render flow');
                    }
                } else {
                    // Not running in Salesforce - show preview/placeholder
                    renderFlowPreview(element, flowName, inputVariables, mode);
                }
            });
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    }, [contentRef, html, onFlowStatus]);
};

/**
 * Render a preview of the flow when not running in Salesforce
 * This is useful for local development and testing
 */
function renderFlowPreview(
    element: HTMLElement, 
    flowName: string, 
    inputs: Array<{ name: string; type: string; value: unknown }>,
    mode: string = 'launcher'
): void {
    element.className = `flow-preview flow-mode-${mode}`;
    
    const modeLabel = mode === 'inline' ? 'Inline Embed' : 'Launcher';
    const modeColor = mode === 'inline' ? 'from-emerald-50 to-teal-50 border-emerald-200' : 'from-blue-50 to-indigo-50 border-blue-200';
    const iconColor = mode === 'inline' ? 'bg-emerald-500' : 'bg-blue-500';
    
    element.innerHTML = `
        <div class="flow-preview-container bg-gradient-to-br ${modeColor} border rounded-lg p-6 my-4 shadow-sm">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 ${iconColor} rounded-lg flex items-center justify-center shadow-md">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                </div>
                <div>
                    <h4 class="text-lg font-semibold text-gray-900 m-0">Salesforce Screen Flow</h4>
                    <p class="text-sm text-gray-600 m-0">${escapeHtml(flowName)}</p>
                </div>
                <span class="ml-auto px-2 py-1 text-xs font-medium rounded ${mode === 'inline' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${modeLabel}</span>
            </div>
            ${inputs.length > 0 ? `
                <div class="mb-4">
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Input Variables</p>
                    <div class="bg-white rounded-md border border-gray-200 overflow-hidden">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="text-left px-3 py-2 text-gray-600 font-medium">Name</th>
                                    <th class="text-left px-3 py-2 text-gray-600 font-medium">Type</th>
                                    <th class="text-left px-3 py-2 text-gray-600 font-medium">Value</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                ${inputs.map(input => `
                                    <tr>
                                        <td class="px-3 py-2 font-mono text-gray-800">${escapeHtml(input.name)}</td>
                                        <td class="px-3 py-2 text-gray-600">${escapeHtml(input.type)}</td>
                                        <td class="px-3 py-2 font-mono text-gray-800">${escapeHtml(String(input.value))}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
            <div class="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span>${mode === 'inline' ? 'This flow will be embedded inline when viewed in Salesforce' : 'This flow will show a launcher card when viewed in Salesforce'}</span>
            </div>
        </div>
    `;
}

/**
 * Render an error state for the flow container
 */
function renderFlowError(element: HTMLElement, message: string): void {
    element.className = 'flow-error';
    element.innerHTML = `
        <div class="flow-error-container bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <div>
                    <h4 class="text-red-800 font-semibold m-0">Flow Error</h4>
                    <p class="text-red-700 text-sm m-0">${escapeHtml(message)}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Handle flow completion
 */
function handleFlowCompletion(element: HTMLElement, _event: FlowStatusEvent): void {
    // Add a subtle completion indicator
    const existingIndicator = element.querySelector('.flow-completion-indicator');
    if (existingIndicator) return;

    const indicator = document.createElement('div');
    indicator.className = 'flow-completion-indicator bg-green-50 border border-green-200 rounded-lg p-3 mt-4';
    indicator.innerHTML = `
        <div class="flex items-center gap-2 text-green-700">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="font-medium">Flow completed successfully</span>
        </div>
    `;
    element.appendChild(indicator);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
