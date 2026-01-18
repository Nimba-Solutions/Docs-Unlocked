/**
 * Process conditional visibility blocks in markdown
 * Generic foundation that supports any condition type via the condition registry
 * Format: :::if condition="..." or :::if all="..." etc.
 * Supports logical operators: all, any, not
 * Supports optional else blocks
 */

import { Condition, conditionRegistry } from './conditions';

export interface ConditionBlock {
  start: number;
  end: number;
  condition: Condition;
  content: string;
  elseContent?: string;
  originalMatch: string;
}

/**
 * Process :::if condition blocks in markdown
 * Skips blocks inside code blocks
 */
export function processConditionBlocks(content: string): ConditionBlock[] {
  const blocks: ConditionBlock[] = [];
  
  // Track fenced code blocks to skip condition blocks inside them
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
  
  // Match :::if blocks
  // Pattern: :::if ... ::: or :::if ... :::else ... ::::
  const ifBlockRegex = /:::if\s+([^\n]+)\n([\s\S]*?)(?:\n:::else\n([\s\S]*?))?\n:::/g;
  
  let match;
  ifBlockRegex.lastIndex = 0;
  
  while ((match = ifBlockRegex.exec(content)) !== null) {
    const matchStartLine = content.substring(0, match.index).split('\n').length - 1;
    const matchEndLine = content.substring(0, match.index + match[0].length).split('\n').length - 1;
    
    // Check if this block overlaps with any code block
    const isInCodeBlock = codeBlockRanges.some(range =>
      (matchStartLine >= range.start && matchStartLine <= range.end) ||
      (matchEndLine >= range.start && matchEndLine <= range.end) ||
      (matchStartLine < range.start && matchEndLine > range.end)
    );
    
    if (!isInCodeBlock) {
      const blockStart = match[1]; // Attributes line
      const blockContent = match[2]; // Content between :::if and ::: or :::else
      const elseContent = match[3]; // Content after :::else (optional)
      
      // Extract attributes from :::if line
      const attrRegex = /(\w+(?:-\w+)*)=["']([^"']+)["']/g;
      const attributes: Record<string, string> = {};
      let attrMatch;
      
      while ((attrMatch = attrRegex.exec(blockStart)) !== null) {
        attributes[attrMatch[1]] = attrMatch[2];
      }
      
      // Parse condition using the registry (tries all registered parsers)
      const condition = conditionRegistry.parse(attributes);
      
      if (condition) {
        blocks.push({
          start: match.index,
          end: match.index + match[0].length,
          condition,
          content: blockContent,
          elseContent: elseContent,
          originalMatch: match[0]
        });
      } else {
        console.warn('[DocsUnlocked] No valid condition attribute found in :::if block:', attributes);
      }
    }
  }
  
  return blocks;
}

/**
 * Replace condition blocks with placeholders that will be processed after condition checks
 * Note: Content is stored as markdown and will be parsed when the placeholder is processed
 */
export function replaceConditionBlocksWithPlaceholders(content: string, blocks: ConditionBlock[]): string {
  let result = content;
  
  // Sort blocks by start position (descending) to apply replacements in reverse order
  const sortedBlocks = [...blocks].sort((a, b) => b.start - a.start);
  
  for (const block of sortedBlocks) {
    // Create a placeholder that encodes the condition and content
    // We'll use a data attribute approach
    // Content is stored as markdown - it will be parsed when processed
    const conditionJson = JSON.stringify(block.condition).replace(/"/g, '&quot;');
    // Escape content for HTML attribute (but keep as markdown)
    const contentEscaped = block.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const elseContentEscaped = block.elseContent 
      ? block.elseContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
      : '';
    
    const placeholder = `<div class="condition-block-placeholder" data-condition='${conditionJson}' data-content='${contentEscaped}' data-else-content='${elseContentEscaped}'></div>`;
    
    result = result.substring(0, block.start) + placeholder + result.substring(block.end);
  }
  
  return result;
}
