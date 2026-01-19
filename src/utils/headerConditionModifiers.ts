/**
 * Process header-level condition modifiers
 * Generic foundation that supports any condition type via the condition registry
 * Format: ## Header Title {permissions="..."} or ## Header Title {condition="..."}
 */

import { Condition, conditionRegistry } from './conditions';

export interface HeaderModifier {
  headerMatch: string;
  headerLevel: string;
  headerContent: string;
  condition: Condition;
  originalMatch: string;
}

/**
 * Find code block ranges to skip headers inside code blocks
 * Properly handles nested code examples by matching fence patterns
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
      // Only close if same character type and >= length
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

function isInCodeBlock(pos: number, ranges: Array<{ start: number; end: number }>): boolean {
  return ranges.some(r => pos >= r.start && pos <= r.end);
}

/**
 * Find all headers with condition modifiers
 * Format: ## Header {permissions="..."} or ## Header {condition="..."}
 * Skips headers inside code blocks
 */
export function findHeaderModifiers(content: string): HeaderModifier[] {
  const modifiers: HeaderModifier[] = [];
  const codeBlockRanges = findCodeBlockRanges(content);
  
  // Match headers with modifiers: ## Title {permissions="..."} or {condition="..."}
  // This regex matches headers (H1-H6) with optional modifiers at the end
  const headerRegex = /^(#{1,6})\s+(.+?)\s*\{([^}]+)\}\s*$/gm;
  
  let match;
  headerRegex.lastIndex = 0;
  
  while ((match = headerRegex.exec(content)) !== null) {
    // Skip headers inside code blocks
    if (isInCodeBlock(match.index, codeBlockRanges)) {
      continue;
    }
    
    const level = match[1];
    const headerContent = match[2].trim();
    const modifier = match[3];
    
    // Extract attributes from modifier
    const attrRegex = /(\w+(?:-\w+)*)=["']([^"']+)["']/g;
    const attributes: Record<string, string> = {};
    let attrMatch;
    
    while ((attrMatch = attrRegex.exec(modifier)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }
    
    // Parse condition using the registry
    const condition = conditionRegistry.parse(attributes);
    
    if (condition) {
      modifiers.push({
        headerMatch: match[0],
        headerLevel: level,
        headerContent,
        condition,
        originalMatch: match[0]
      });
    }
  }
  
  return modifiers;
}

/**
 * Remove modifiers from headers (for markdown processing)
 * Converts: ## Title {permissions="..."} -> ## Title
 * Skips headers inside code blocks
 */
export function removeHeaderModifiers(content: string): string {
  const codeBlockRanges = findCodeBlockRanges(content);
  const headerRegex = /^(#{1,6})\s+(.+?)\s*\{[^}]+\}\s*$/gm;
  
  // Collect replacements, filtering out code block matches
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];
  let match;
  
  while ((match = headerRegex.exec(content)) !== null) {
    if (!isInCodeBlock(match.index, codeBlockRanges)) {
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: `${match[1]} ${match[2].trim()}`
      });
    }
  }
  
  // Apply replacements in reverse order
  let result = content;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    result = result.substring(0, r.start) + r.replacement + result.substring(r.end);
  }
  
  return result;
}
