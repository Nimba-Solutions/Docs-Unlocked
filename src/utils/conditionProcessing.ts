/**
 * Process conditional visibility blocks in markdown
 * Generic foundation that supports any condition type via the condition registry
 * Format: :::if attr="value" ... ::else ... :::
 * Supports nested blocks
 */
import { Condition, conditionRegistry } from './conditions';
import { removeHeaderModifiers } from './headerConditionModifiers';

export interface ConditionBlock {
    start: number;
    end: number;
    condition: Condition;
    content: string;
    elseContent?: string;
    elseStart?: number; // Position of ::else marker
    originalMatch: string;
}

interface ParsedBlock {
    start: number;
    end: number;
    condition: Condition;
    elsePos?: number; // Position where ::else starts (if present)
    elseEndPos?: number; // Position where ::else ends (if present)
    ifEndPos: number; // Position where :::if line ends
    endStartPos: number; // Position where closing ::: starts
}

/**
 * Process :::if condition blocks in markdown
 * Skips blocks inside code blocks
 * Format: :::if attr="value" ... ::else ... :::
 */
export function processConditionBlocks(content: string): ConditionBlock[] {
    const blocks: ConditionBlock[] = [];
    const codeBlockRanges = findCodeBlockRanges(content);

    // Tokenize: find all markers with their positions
    const markers: Array<{
        type: 'if' | 'else' | 'end';
        pos: number;
        endPos: number;
        attrs?: string;
    }> = [];

    // Find all :::if
    const ifRegex = /^:::if\s+(.+)$/gm;
    let match;
    while ((match = ifRegex.exec(content)) !== null) {
        if (!isInCodeBlock(match.index, codeBlockRanges)) {
            markers.push({
                type: 'if',
                pos: match.index,
                endPos: match.index + match[0].length,
                attrs: match[1]
            });
        }
    }

    // Find all ::else (interior, 2 colons)
    const elseRegex = /^::else$/gm;
    while ((match = elseRegex.exec(content)) !== null) {
        if (!isInCodeBlock(match.index, codeBlockRanges)) {
            markers.push({
                type: 'else',
                pos: match.index,
                endPos: match.index + match[0].length
            });
        }
    }

    // Find all ::: (closing, 3 colons, alone on line)
    const endRegex = /^:::$/gm;
    while ((match = endRegex.exec(content)) !== null) {
        if (!isInCodeBlock(match.index, codeBlockRanges)) {
            markers.push({
                type: 'end',
                pos: match.index,
                endPos: match.index + match[0].length
            });
        }
    }

    // Sort by position
    markers.sort((a, b) => a.pos - b.pos);

    // Stack-based parsing - only collect positions, not content
    const parsedBlocks: ParsedBlock[] = [];
    const stack: Array<{
        ifMarker: typeof markers[0];
        elseMarker?: typeof markers[0];
    }> = [];

    for (const marker of markers) {
        if (marker.type === 'if') {
            stack.push({ ifMarker: marker });
        } else if (marker.type === 'else') {
            if (stack.length > 0 && !stack[stack.length - 1].elseMarker) {
                stack[stack.length - 1].elseMarker = marker;
            }
        } else if (marker.type === 'end') {
            if (stack.length > 0) {
                const frame = stack.pop()!;
                const ifMarker = frame.ifMarker;
                const elseMarker = frame.elseMarker;

                // Parse attributes
                const attributes = parseAttributes(ifMarker.attrs || '');
                const condition = conditionRegistry.parse(attributes);

                if (condition) {
                    const parsed: ParsedBlock = {
                        start: ifMarker.pos,
                        end: marker.endPos,
                        condition,
                        ifEndPos: ifMarker.endPos,
                        endStartPos: marker.pos
                    };

                    if (elseMarker) {
                        parsed.elsePos = elseMarker.pos;
                        parsed.elseEndPos = elseMarker.endPos;
                    }

                    parsedBlocks.push(parsed);
                }
            }
        }
    }

    // Convert to ConditionBlocks with content extracted from original
    for (const parsed of parsedBlocks) {
        let blockContent: string;
        let elseContent: string | undefined;

        if (parsed.elsePos !== undefined && parsed.elseEndPos !== undefined) {
            blockContent = content.substring(parsed.ifEndPos + 1, parsed.elsePos).trim();
            elseContent = content.substring(parsed.elseEndPos + 1, parsed.endStartPos).trim();
        } else {
            blockContent = content.substring(parsed.ifEndPos + 1, parsed.endStartPos).trim();
        }

        blocks.push({
            start: parsed.start,
            end: parsed.end,
            condition: parsed.condition,
            content: blockContent,
            elseContent,
            elseStart: parsed.elsePos,
            originalMatch: content.substring(parsed.start, parsed.end)
        });
    }

    return blocks;
}

function parseAttributes(attrLine: string): Record<string, string> {
    const attrRegex = /(\w+(?:-\w+)*)=["']([^"']+)["']/g;
    const attributes: Record<string, string> = {};
    let match;
    while ((match = attrRegex.exec(attrLine)) !== null) {
        attributes[match[1]] = match[2];
    }
    return attributes;
}

function isInCodeBlock(pos: number, ranges: Array<{ start: number; end: number }>): boolean {
    return ranges.some(r => pos >= r.start && pos <= r.end);
}

function findCodeBlockRanges(content: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    // Match opening fence with optional language, or closing fence
    const fenceRegex = /^(```+|~~~+)([^\n]*)?$/gm;
    let inBlock = false;
    let blockStart = 0;
    let openingFenceChar = '';
    let openingFenceLength = 0;
    let match;

    while ((match = fenceRegex.exec(content)) !== null) {
        const fence = match[1];
        const fenceChar = fence[0]; // '`' or '~'
        const fenceLength = fence.length;

        if (!inBlock) {
            // Opening a new code block
            inBlock = true;
            blockStart = match.index;
            openingFenceChar = fenceChar;
            openingFenceLength = fenceLength;
        } else {
            // Check if this fence closes the current block
            // Must be same character type and >= length
            if (fenceChar === openingFenceChar && fenceLength >= openingFenceLength) {
                ranges.push({ start: blockStart, end: match.index + match[0].length });
                inBlock = false;
                openingFenceChar = '';
                openingFenceLength = 0;
            }
            // If fence doesn't match, it's part of the code block content (nested example)
        }
    }

    if (inBlock) {
        ranges.push({ start: blockStart, end: content.length });
    }

    return ranges;
}

/**
 * Replace condition blocks with placeholders that will be processed after condition checks
 * Handles nested blocks by processing innermost first
 */
export function replaceConditionBlocksWithPlaceholders(content: string, blocks: ConditionBlock[]): string {
    if (blocks.length === 0) return content;

    let result = content;

    // Sort blocks by nesting depth (innermost first), then by position descending
    // Innermost blocks have no other blocks fully contained within them
    const sortedBlocks = sortByNestingDepth(blocks);

    // Track position adjustments from previous replacements
    const adjustments: Array<{ originalStart: number; originalEnd: number; newLength: number }> = [];

    for (const block of sortedBlocks) {
        // Calculate adjusted positions based on previous replacements
        let adjustedStart = block.start;
        let adjustedEnd = block.end;

        for (const adj of adjustments) {
            const originalLength = adj.originalEnd - adj.originalStart;
            const shift = adj.newLength - originalLength;

            if (adj.originalEnd <= block.start) {
                // Replacement was entirely before this block, shift both positions
                adjustedStart += shift;
                adjustedEnd += shift;
            } else if (adj.originalStart >= block.start && adj.originalEnd <= block.end) {
                // Replacement was INSIDE this block (nested block), only adjust end
                adjustedEnd += shift;
            } else if (adj.originalStart < block.start && adj.originalEnd > block.end) {
                // This block is inside the replacement (shouldn't happen with proper nesting order)
                console.warn('[DocsUnlocked] Unexpected: block inside previous replacement');
            }
        }

        // Extract fresh content from current result string
        // Find the :::if line end and ::: positions in the current string
        const blockText = result.substring(adjustedStart, adjustedEnd);

        // Find positions within the block text
        const ifLineEnd = blockText.indexOf('\n');
        const elseMatch = blockText.match(/^::else$/m);
        const endMatch = blockText.match(/^:::$/m);

        if (ifLineEnd === -1 || !endMatch) {
            console.warn('[DocsUnlocked] Malformed condition block, skipping');
            continue;
        }

        let blockContent: string;
        let elseContent: string | undefined;

        if (elseMatch && elseMatch.index !== undefined) {
            blockContent = blockText.substring(ifLineEnd + 1, elseMatch.index).trim();
            const elseLineEnd = blockText.indexOf('\n', elseMatch.index);
            if (elseLineEnd !== -1 && endMatch.index !== undefined) {
                elseContent = blockText.substring(elseLineEnd + 1, endMatch.index).trim();
            }
        } else if (endMatch.index !== undefined) {
            blockContent = blockText.substring(ifLineEnd + 1, endMatch.index).trim();
        } else {
            blockContent = '';
        }

        // Strip header modifiers from content (they'll be processed separately)
        blockContent = removeHeaderModifiers(blockContent);
        if (elseContent) {
            elseContent = removeHeaderModifiers(elseContent);
        }

        // Create placeholder
        const conditionJson = JSON.stringify(block.condition).replace(/"/g, '&quot;');
        const contentEscaped = escapeForAttribute(blockContent);
        const elseContentEscaped = elseContent ? escapeForAttribute(elseContent) : '';

        const placeholder = `<div class="condition-block-placeholder" data-condition="${conditionJson}" data-content="${contentEscaped}" data-else-content="${elseContentEscaped}"></div>`;

        // Replace in result
        result = result.substring(0, adjustedStart) + placeholder + result.substring(adjustedEnd);

        // Track this adjustment
        adjustments.push({
            originalStart: block.start,
            originalEnd: block.end,
            newLength: placeholder.length
        });
    }

    return result;
}

/**
 * Sort blocks so innermost (most deeply nested) blocks come first
 */
function sortByNestingDepth(blocks: ConditionBlock[]): ConditionBlock[] {
    // Calculate nesting depth for each block
    const withDepth = blocks.map(block => {
        let depth = 0;
        for (const other of blocks) {
            if (other !== block && other.start < block.start && other.end > block.end) {
                depth++;
            }
        }
        return { block, depth };
    });

    // Sort by depth descending (deepest first), then by start position descending
    withDepth.sort((a, b) => {
        if (b.depth !== a.depth) return b.depth - a.depth;
        return b.block.start - a.block.start;
    });

    return withDepth.map(x => x.block);
}

/**
 * Escape content for use in HTML attribute
 */
function escapeForAttribute(content: string): string {
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '&#10;');
}
