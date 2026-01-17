import { NavCard } from '../types';

// Helper to parse NavCard definitions from markdown
export const parseNavCards = (markdown: string): NavCard[] => {
  const navCards: NavCard[] = [];
  
  // Match :::navcards blocks
  const navCardsRegex = /:::navcards\s*\n([\s\S]*?)\n:::/g;
  const matches = markdown.matchAll(navCardsRegex);
  
  for (const match of matches) {
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
  // Match <pre><code> blocks
  return html.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, codeContent) => {
    // Escape HTML entities for data attribute
    const escapedCode = codeContent
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
