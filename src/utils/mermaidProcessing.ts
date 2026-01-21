/**
 * Mermaid diagram processing for Docs Unlocked
 * 
 * Parses ```mermaid code blocks in markdown and replaces them with
 * placeholder divs for client-side rendering.
 * 
 * Usage in markdown:
 *   ```mermaid
 *   graph TD
 *       A[Start] --> B{Decision}
 *       B -->|Yes| C[Action]
 *       B -->|No| D[End]
 *   ```
 */

export interface MermaidBlock {
    /** Start position in the source content */
    start: number;
    /** End position in the source content */
    end: number;
    /** The mermaid diagram definition */
    definition: string;
    /** Original matched text */
    originalMatch: string;
}

/**
 * Find all fenced code block ranges in content
 * Handles variable fence lengths (3+, 4+, etc.) to properly nest code blocks
 */
function findCodeBlockRanges(content: string): Array<{ start: number; end: number; fenceLength: number }> {
    const ranges: Array<{ start: number; end: number; fenceLength: number }> = [];
    // Match opening fences with 3+ backticks or tildes
    const fenceRegex = /^(`{3,}|~{3,})([^\n`~]*)$/gm;

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
            // Opening a new code block
            inBlock = true;
            blockStart = match.index;
            openingFenceChar = fenceChar;
            openingFenceLength = fenceLength;
        } else {
            // Check if this closes the current block
            // Closing fence must use same char and be at least as long
            if (fenceChar === openingFenceChar && fenceLength >= openingFenceLength) {
                ranges.push({
                    start: blockStart,
                    end: match.index + match[0].length,
                    fenceLength: openingFenceLength
                });
                inBlock = false;
                openingFenceChar = '';
                openingFenceLength = 0;
            }
            // If fence doesn't match, it's content inside the block - ignore it
        }
    }

    // Handle unclosed block at end of content
    if (inBlock) {
        ranges.push({ start: blockStart, end: content.length, fenceLength: openingFenceLength });
    }

    return ranges;
}

/**
 * Parse mermaid code blocks from markdown content
 * 
 * Finds all ```mermaid blocks and extracts their diagram definitions.
 * Skips mermaid blocks that are nested inside other code blocks (e.g., ````markdown examples).
 */
export function parseMermaidBlocks(content: string): MermaidBlock[] {
    const blocks: MermaidBlock[] = [];

    // First, find all code block ranges to avoid matching mermaid inside examples
    const codeBlockRanges = findCodeBlockRanges(content);

    // Match ```mermaid blocks (exactly 3 backticks)
    // Handle both Unix (\n) and Windows (\r\n) line endings
    const mermaidRegex = /^```mermaid(?:-\w+)?\s*\r?\n([\s\S]*?)^```\s*$/gm;

    let match: RegExpExecArray | null;
    while ((match = mermaidRegex.exec(content)) !== null) {
        const matchIndex = match.index;
        const matchContent = match[1];
        const matchFull = match[0];

        // Check if this mermaid block is inside a larger code block (4+ backticks)
        // by checking if any code block with fenceLength > 3 contains this position
        const isNested = codeBlockRanges.some(range =>
            range.fenceLength > 3 &&
            matchIndex > range.start &&
            matchIndex < range.end
        );

        if (isNested) {
            // Skip - this is an example inside a ````markdown block
            continue;
        }

        const definition = matchContent.trim();

        if (!definition) {
            console.warn('[DocsUnlocked] Empty mermaid block found, skipping');
            continue;
        }

        blocks.push({
            start: matchIndex,
            end: matchIndex + matchFull.length,
            definition,
            originalMatch: matchFull
        });
    }

    if (blocks.length > 0) {
        console.log('[DocsUnlocked] Parsed ' + blocks.length + ' mermaid block(s)');
    }

    return blocks;
}

/**
 * Replace mermaid blocks with placeholder divs
 * 
 * The placeholders contain the diagram definition in a data attribute,
 * which will be used by the useMermaidEffects hook to render the diagrams.
 */
export function replaceMermaidBlocksWithPlaceholders(
    content: string,
    blocks: MermaidBlock[]
): string {
    if (blocks.length === 0) return content;

    let result = content;

    // Sort by start position descending to preserve indices during replacement
    const sortedBlocks = [...blocks].sort((a, b) => b.start - a.start);

    for (const block of sortedBlocks) {
        // Escape the definition for HTML attribute storage
        const escapedDefinition = escapeForDataAttribute(block.definition);

        // Create a unique ID for this diagram
        const diagramId = `mermaid-${generateUniqueId()}`;

        // Create placeholder div that will be preserved through markdown parsing
        // Use base64 encoding in the hidden element to avoid HTML entity issues
        const base64Definition = btoa(unescape(encodeURIComponent(block.definition)));
        const placeholder = `<div class="mermaid-placeholder" data-mermaid-id="${diagramId}" data-mermaid-definition="${escapedDefinition}" data-mermaid-base64="${base64Definition}"></div>`;

        result = result.substring(0, block.start) + placeholder + result.substring(block.end);
    }

    return result;
}

/**
 * Escape content for use in HTML data attributes
 * Handles special characters that would break attribute parsing
 */
function escapeForDataAttribute(content: string): string {
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '&#10;')
        .replace(/\r/g, '&#13;');
}

/**
 * Unescape content from HTML data attribute format
 */
export function unescapeFromDataAttribute(content: string): string {
    return content
        .replace(/&#13;/g, '\r')
        .replace(/&#10;/g, '\n')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');
}

/**
 * Generate a unique ID for mermaid diagrams
 */
function generateUniqueId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Detect the type of mermaid diagram from its definition
 * Useful for applying diagram-specific styling
 */
export function detectDiagramType(definition: string): string {
    const firstLine = definition.trim().split('\n')[0].toLowerCase();

    if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
        return 'flowchart';
    }
    if (firstLine.startsWith('sequencediagram')) {
        return 'sequence';
    }
    if (firstLine.startsWith('classdiagram')) {
        return 'class';
    }
    if (firstLine.startsWith('statediagram')) {
        return 'state';
    }
    if (firstLine.startsWith('erdiagram')) {
        return 'er';
    }
    if (firstLine.startsWith('journey')) {
        return 'journey';
    }
    if (firstLine.startsWith('gantt')) {
        return 'gantt';
    }
    if (firstLine.startsWith('pie')) {
        return 'pie';
    }
    if (firstLine.startsWith('quadrantchart')) {
        return 'quadrant';
    }
    if (firstLine.startsWith('requirementdiagram')) {
        return 'requirement';
    }
    if (firstLine.startsWith('gitgraph')) {
        return 'gitgraph';
    }
    if (firstLine.startsWith('mindmap')) {
        return 'mindmap';
    }
    if (firstLine.startsWith('timeline')) {
        return 'timeline';
    }
    if (firstLine.startsWith('sankey')) {
        return 'sankey';
    }
    if (firstLine.startsWith('xychart')) {
        return 'xychart';
    }
    if (firstLine.startsWith('block')) {
        return 'block';
    }

    return 'unknown';
}
