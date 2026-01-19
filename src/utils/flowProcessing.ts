/**
 * Process :::flow blocks in markdown for embedding Salesforce Screen Flows
 * 
 * Syntax:
 *   :::flow name="Flow_API_Name"
 *   :::
 * 
 * With input variables:
 *   :::flow name="Flow_API_Name" AccountId="001XXXXXXXX" ContactName="John Doe"
 *   :::
 * 
 * Or YAML-style inside the block:
 *   :::flow name="Flow_API_Name"
 *   AccountId: 001XXXXXXXX
 *   ContactName: John Doe
 *   :::
 */

export interface FlowInput {
    name: string;
    type: 'String' | 'Number' | 'Boolean' | 'Date' | 'DateTime' | 'SObject' | 'Apex';
    value: string;
}

export interface FlowBlock {
    start: number;
    end: number;
    flowName: string;
    inputs: FlowInput[];
    originalMatch: string;
}

/**
 * Parse flow blocks from markdown content
 * Skips blocks inside code blocks
 */
export function parseFlowBlocks(content: string): FlowBlock[] {
    const blocks: FlowBlock[] = [];
    const codeBlockRanges = findCodeBlockRanges(content);

    // Match :::flow blocks - captures the opening line attributes and optional body content
    // Pattern: :::flow <attributes>\n<optional body>\n:::
    const flowBlockRegex = /^:::flow\s+([^\n]+)\n([\s\S]*?)^:::\s*$/gm;

    // Debug: log if we find the pattern text
    if (content.includes(':::flow')) {
        console.log('[DocsUnlocked] parseFlowBlocks: Content contains :::flow');
        // Try to find a simple match first
        const simpleTest = content.match(/:::flow\s+name=/);
        console.log('[DocsUnlocked] parseFlowBlocks: Simple pattern test:', simpleTest ? 'FOUND' : 'NOT FOUND');

        // Debug: test the full regex
        const testRegex = /^:::flow\s+([^\n]+)\n([\s\S]*?)^:::\s*$/gm;
        const testMatch = testRegex.exec(content);
        console.log('[DocsUnlocked] parseFlowBlocks: Full regex test:', testMatch ? 'MATCHED' : 'NO MATCH');
        if (!testMatch) {
            // Try alternate regex without the $ anchor
            const altRegex = /^:::flow\s+([^\n]+)\n([\s\S]*?)^:::/gm;
            const altMatch = altRegex.exec(content);
            console.log('[DocsUnlocked] parseFlowBlocks: Alt regex test (no $):', altMatch ? 'MATCHED' : 'NO MATCH');
        }
    }

    let match;
    while ((match = flowBlockRegex.exec(content)) !== null) {
        console.log('[DocsUnlocked] parseFlowBlocks: Found match at index', match.index);
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        // Skip if inside a code block
        if (isInCodeBlock(matchStart, codeBlockRanges)) {
            continue;
        }

        const attributeLine = match[1].trim();
        const bodyContent = match[2]?.trim() || '';

        // Parse flow name from attributes
        const nameMatch = attributeLine.match(/name=["']([^"']+)["']/);
        if (!nameMatch) {
            console.warn('[DocsUnlocked] Flow block missing required "name" attribute');
            continue;
        }

        const flowName = nameMatch[1];
        const inputs: FlowInput[] = [];

        // Parse inline attributes (excluding name)
        const inlineInputs = parseInlineAttributes(attributeLine);
        inputs.push(...inlineInputs);

        // Parse YAML-style inputs from body
        if (bodyContent) {
            const yamlInputs = parseYamlInputs(bodyContent);
            inputs.push(...yamlInputs);
        }

        blocks.push({
            start: matchStart,
            end: matchEnd,
            flowName,
            inputs,
            originalMatch: match[0]
        });
    }

    return blocks;
}

/**
 * Parse inline attributes from the :::flow opening line
 * Format: key="value" or key='value'
 * Supports type annotations: key:Type="value"
 */
function parseInlineAttributes(attrLine: string): FlowInput[] {
    const inputs: FlowInput[] = [];
    // Match: name:Type="value" or name="value" (excluding the 'name' attribute itself)
    const attrRegex = /(?<!^)(\w+)(?::(\w+))?=["']([^"']+)["']/g;

    let match;
    while ((match = attrRegex.exec(attrLine)) !== null) {
        const inputName = match[1];
        // Skip the 'name' attribute as it's the flow name
        if (inputName.toLowerCase() === 'name') continue;

        const typeAnnotation = match[2] || 'String';
        const value = match[3];

        inputs.push({
            name: inputName,
            type: normalizeType(typeAnnotation),
            value
        });
    }

    return inputs;
}

/**
 * Parse YAML-style inputs from the flow block body
 * Format: 
 *   inputName: value
 *   inputName:Type: value
 */
function parseYamlInputs(body: string): FlowInput[] {
    const inputs: FlowInput[] = [];
    const lines = body.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Match: inputName:Type: value or inputName: value
        const yamlMatch = trimmed.match(/^(\w+)(?::(\w+))?:\s*(.+)$/);
        if (yamlMatch) {
            const inputName = yamlMatch[1];
            const typeAnnotation = yamlMatch[2] || 'String';
            const value = yamlMatch[3].trim();

            // Remove surrounding quotes if present
            const cleanValue = value.replace(/^["'](.*)["']$/, '$1');

            inputs.push({
                name: inputName,
                type: normalizeType(typeAnnotation),
                value: cleanValue
            });
        }
    }

    return inputs;
}

/**
 * Normalize type annotation to Salesforce Flow input types
 */
function normalizeType(type: string): FlowInput['type'] {
    const normalized = type.toLowerCase();
    switch (normalized) {
        case 'string':
        case 'text':
            return 'String';
        case 'number':
        case 'integer':
        case 'decimal':
        case 'currency':
            return 'Number';
        case 'boolean':
        case 'bool':
            return 'Boolean';
        case 'date':
            return 'Date';
        case 'datetime':
            return 'DateTime';
        case 'sobject':
        case 'record':
            return 'SObject';
        case 'apex':
            return 'Apex';
        default:
            return 'String';
    }
}

/**
 * Replace flow blocks with placeholder divs
 */
export function replaceFlowBlocksWithPlaceholders(content: string, blocks: FlowBlock[]): string {
    if (blocks.length === 0) return content;

    let result = content;

    // Sort by start position descending to preserve indices during replacement
    const sortedBlocks = [...blocks].sort((a, b) => b.start - a.start);

    for (const block of sortedBlocks) {
        const inputsJson = JSON.stringify(block.inputs)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const placeholder = `<div class="flow-placeholder" data-flow-name="${escapeForAttribute(block.flowName)}" data-flow-inputs="${inputsJson}"></div>`;

        result = result.substring(0, block.start) + placeholder + result.substring(block.end);
    }

    return result;
}

/**
 * Escape content for use in HTML attributes
 */
function escapeForAttribute(content: string): string {
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Check if a position is inside a code block
 */
function isInCodeBlock(pos: number, ranges: Array<{ start: number; end: number }>): boolean {
    return ranges.some(r => pos >= r.start && pos <= r.end);
}

/**
 * Find all fenced code block ranges in content
 */
function findCodeBlockRanges(content: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    const fenceRegex = /^(```+|~~~+)([^\n]*)?$/gm;
    let inBlock = false;
    let blockStart = 0;
    let openingFenceChar = '';
    let openingFenceLength = 0;
    let match;

    while ((match = fenceRegex.exec(content)) !== null) {
        const fence = match[1];
        const fenceChar = fence[0];
        const fenceLength = fence.length;

        if (!inBlock) {
            inBlock = true;
            blockStart = match.index;
            openingFenceChar = fenceChar;
            openingFenceLength = fenceLength;
        } else {
            if (fenceChar === openingFenceChar && fenceLength >= openingFenceLength) {
                ranges.push({ start: blockStart, end: match.index + match[0].length });
                inBlock = false;
                openingFenceChar = '';
                openingFenceLength = 0;
            }
        }
    }

    if (inBlock) {
        ranges.push({ start: blockStart, end: content.length });
    }

    return ranges;
}

/**
 * Convert FlowInput array to Salesforce Lightning flow input variable format
 */
export function convertToFlowInputVariables(inputs: FlowInput[]): Array<{ name: string; type: string; value: unknown }> {
    return inputs.map(input => {
        let value: unknown = input.value;

        // Convert value based on type
        switch (input.type) {
            case 'Number':
                value = parseFloat(input.value);
                if (isNaN(value as number)) value = 0;
                break;
            case 'Boolean':
                value = input.value.toLowerCase() === 'true' || input.value === '1';
                break;
            case 'Date':
            case 'DateTime':
                // Keep as string - Salesforce will parse it
                value = input.value;
                break;
            default:
                value = input.value;
        }

        return {
            name: input.name,
            type: input.type,
            value
        };
    });
}
