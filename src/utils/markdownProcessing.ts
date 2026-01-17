import { marked } from 'marked';
import { NavCard } from '../types';

/**
 * Process GitHub-style callouts in markdown
 * Format: > [!NOTE] ... or > [!IMPORTANT] ... etc.
 */
export const processCallouts = (content: string): string => {
  // Process GitHub-style callouts before parsing
  // Match blockquotes that start with [!TYPE] and continue until next non-blockquote line
  let processed = content.replace(/^>\s*\[!([A-Z]+)\]\s*\n((?:>.*\n?)*)/gm, (_match, type, content) => {
    const calloutTypes: Record<string, { bg: string; border: string; icon: string; title: string }> = {
      'NOTE': { bg: 'bg-blue-50', border: 'border-blue-200', icon: '💡', title: 'Note' },
      'TIP': { bg: 'bg-green-50', border: 'border-green-200', icon: '💡', title: 'Tip' },
      'IMPORTANT': { bg: 'bg-yellow-50', border: 'border-yellow-300', icon: '⚠️', title: 'Important' },
      'WARNING': { bg: 'bg-orange-50', border: 'border-orange-300', icon: '⚠️', title: 'Warning' },
      'CAUTION': { bg: 'bg-red-50', border: 'border-red-300', icon: '⚠️', title: 'Caution' }
    };
    const callout = calloutTypes[type] || calloutTypes['NOTE'];
    // Remove > prefix from each line and trim
    const cleanContent = content.replace(/^>\s?/gm, '').trim();
    // Parse the content as markdown to support nested markdown (links, bold, etc.)
    const parsedContent = marked.parse(cleanContent) as string;
    return `\n<div class="callout ${callout.bg} ${callout.border} border-l-4 rounded-lg p-4 my-4">\n<div class="flex items-start gap-2 mb-1">\n<span class="text-lg flex-shrink-0">${callout.icon}</span>\n<p class="font-semibold text-gray-900 m-0 leading-tight">${callout.title}</p>\n</div>\n<div class="text-gray-700">${parsedContent}</div>\n</div>\n`;
  });

  // Also convert existing "Important:" patterns to callouts (standalone or in paragraphs)
  processed = processed.replace(/\*\*Important:\*\*\s*([^\n]+)/g, (_match, text) => {
    return `\n<div class="callout bg-yellow-50 border-yellow-300 border-l-4 rounded-lg p-4 my-4">\n<div class="flex items-start gap-2 mb-1">\n<span class="text-lg flex-shrink-0">⚠️</span>\n<p class="font-semibold text-gray-900 m-0 leading-tight">Important</p>\n</div>\n<div class="text-gray-700"><strong>Important:</strong> ${text}</div>\n</div>\n`;
  });

  return processed;
};

/**
 * Replace :::navcards blocks with placeholder divs
 * Skips navcards inside code blocks (fenced code blocks only - most common case)
 */
export const processNavCardsPlaceholders = (content: string): string => {
  const navCardsRegex = /:::navcards\s*\n([\s\S]*?)\n:::/g;
  
  // Track fenced code blocks (``` or ~~~)
  const lines = content.split('\n');
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
  
  // Process navcards, skipping those inside code blocks
  let result = content;
  let match;
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];
  
  // Reset regex
  navCardsRegex.lastIndex = 0;
  
  while ((match = navCardsRegex.exec(content)) !== null) {
    const matchStartLine = content.substring(0, match.index).split('\n').length - 1;
    const matchEndLine = content.substring(0, match.index + match[0].length).split('\n').length - 1;
    
    // Check if this navcards block overlaps with any code block
    const isInCodeBlock = codeBlockRanges.some(range => 
      (matchStartLine >= range.start && matchStartLine <= range.end) ||
      (matchEndLine >= range.start && matchEndLine <= range.end) ||
      (matchStartLine < range.start && matchEndLine > range.end)
    );
    
    if (!isInCodeBlock) {
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: '<div class="navcards-container"></div>'
      });
    }
  }
  
  // Apply replacements in reverse order to preserve indices
  for (let i = replacements.length - 1; i >= 0; i--) {
    const rep = replacements[i];
    result = result.substring(0, rep.start) + rep.replacement + result.substring(rep.end);
  }
  
  return result;
};

/**
 * Replace navcards container placeholders with actual NavCard HTML placeholders
 */
export const injectNavCardsPlaceholders = (html: string, navCards: NavCard[]): string => {
  const navCardsContainerRegex = /<div\s+class="navcards-container"[^>]*><\/div>/g;
  return html.replace(navCardsContainerRegex, () => {
    const cardsHtml = navCards.map((card, idx) => 
      `<div class="navcard-placeholder" data-title="${card.title.replace(/"/g, '&quot;')}" data-description="${card.description.replace(/"/g, '&quot;')}" data-href="${card.href.replace(/"/g, '&quot;')}" data-index="${idx}"></div>`
    ).join('');
    return `<div class="navcards-grid grid sm:grid-cols-2 gap-4">${cardsHtml}</div>`;
  });
};
