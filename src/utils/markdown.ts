import { NavCard } from '../types';

// Helper to parse NavCard definitions from markdown
// Skips navcards inside code blocks
export const parseNavCards = (markdown: string): NavCard[] => {
    const navCards: NavCard[] = [];

    // First, find all fenced code blocks to exclude navcards inside them
    const lines = markdown.split('\n');
    const codeBlockRanges: Array<{ start: number; end: number }> = [];
    let inFencedBlock = false;
    let fenceChar = '';
    let fenceStart = -1;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const fenceMatch = trimmed.match(/^(```+|~~~+)/);

        if (fenceMatch) {
            if (!inFencedBlock) {
                inFencedBlock = true;
                fenceChar = fenceMatch[1][0];
                fenceStart = i;
            } else if (trimmed.startsWith(fenceChar.repeat(3))) {
                codeBlockRanges.push({ start: fenceStart, end: i });
                inFencedBlock = false;
                fenceStart = -1;
            }
        }
    }

    // Close any open block at end
    if (inFencedBlock && fenceStart !== -1) {
        codeBlockRanges.push({ start: fenceStart, end: lines.length - 1 });
    }

    // Match :::navcards blocks
    const navCardsRegex = /:::navcards\s*\n([\s\S]*?)\n:::/g;
    let match;

    while ((match = navCardsRegex.exec(markdown)) !== null) {
        const matchStartLine = markdown.substring(0, match.index).split('\n').length - 1;
        const matchEndLine = markdown.substring(0, match.index + match[0].length).split('\n').length - 1;

        // Check if this navcards block overlaps with any code block
        const isInCodeBlock = codeBlockRanges.some(range =>
            (matchStartLine >= range.start && matchStartLine <= range.end) ||
            (matchEndLine >= range.start && matchEndLine <= range.end) ||
            (matchStartLine < range.start && matchEndLine > range.end)
        );

        if (isInCodeBlock) {
            continue; // Skip navcards inside code blocks
        }

        const content = match[1];

        // Try YAML-like format first (title: ... description: ... href: ...)
        const yamlCards = content.split(/^---$/gm);

        for (const cardBlock of yamlCards) {
            const titleMatch = cardBlock.match(/^title:\s*(.+)$/m);
            const descMatch = cardBlock.match(/^description:\s*(.+)$/m);
            const hrefMatch = cardBlock.match(/^href:\s*(.+)$/m);

            if (titleMatch && descMatch && hrefMatch) {
                navCards.push({
                    title: titleMatch[1].trim(),
                    description: descMatch[1].trim(),
                    href: hrefMatch[1].trim()
                });
                continue;
            }

            // Try markdown link format: - [Title](href) - Description
            const linkMatch = cardBlock.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)\s*-\s*(.+)$/m);
            if (linkMatch) {
                navCards.push({
                    title: linkMatch[1].trim(),
                    description: linkMatch[3].trim(),
                    href: linkMatch[2].trim()
                });
            }
        }
    }

    return navCards;
};

// Helper to wrap code blocks with copy button (post-processing)
export const wrapCodeBlocks = (html: string): string => {
    // Match <pre><code> blocks (highlight.js may add classes)
    return html.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, codeContent) => {
        // Get raw code text for copy button (remove HTML tags added by highlight.js)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = codeContent;
        const rawCode = tempDiv.textContent || tempDiv.innerText || codeContent;

        // Escape HTML entities for data attribute
        const escapedCode = rawCode
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return `<div class="relative group code-block-wrapper">
      <div class="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button class="copy-code-btn px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded" data-code="${escapedCode}">
          Copy
        </button>
      </div>
      ${match}
    </div>`;
    });
};
