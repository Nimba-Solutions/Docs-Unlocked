/**
 * Process permission-based conditional visibility blocks in markdown
 * Format: :::if permission="..." or :::if all="..." etc.
 * Supports: permission, custom-permission, permission-set, profile, object, field
 * Supports logical operators: all, any, not
 * Supports optional else blocks
 */

import { PermissionCheck, PermissionCondition } from './permissions';

export interface PermissionBlock {
  start: number;
  end: number;
  condition: PermissionCondition | PermissionCheck;
  content: string;
  elseContent?: string;
  originalMatch: string;
}

/**
 * Parse permission attributes from :::if block
 * Handles: permission, custom-permission, permission-set, profile, object, field, all, any, not
 */
function parsePermissionAttributes(blockStart: string): { condition: PermissionCondition | PermissionCheck; hasObjectAccess: boolean } {
  // Extract attributes from :::if line
  // Match: :::if permission="..." or :::if all="..." etc.
  const attrRegex = /(\w+(?:-\w+)*)=["']([^"']+)["']/g;
  const attributes: Record<string, string> = {};
  let match;
  
  while ((match = attrRegex.exec(blockStart)) !== null) {
    attributes[match[1]] = match[2];
  }
  
  // Check for logical operators
  if (attributes['all']) {
    const checks: PermissionCheck[] = [];
    const values = attributes['all'].split(',').map(v => v.trim()).filter(v => v);
    for (const val of values) {
      // Try to infer type from common patterns
      if (val.includes('__')) {
        checks.push({ type: 'custom-permission', value: val });
      } else {
        checks.push({ type: 'permission', value: val });
      }
    }
    return { condition: { operator: 'all', checks }, hasObjectAccess: false };
  }
  
  if (attributes['any']) {
    const checks: PermissionCheck[] = [];
    const values = attributes['any'].split(',').map(v => v.trim()).filter(v => v);
    for (const val of values) {
      if (val.includes('__')) {
        checks.push({ type: 'custom-permission', value: val });
      } else {
        checks.push({ type: 'permission', value: val });
      }
    }
    return { condition: { operator: 'any', checks }, hasObjectAccess: false };
  }
  
  if (attributes['not']) {
    const checks: PermissionCheck[] = [];
    const values = attributes['not'].split(',').map(v => v.trim()).filter(v => v);
    for (const val of values) {
      if (val.includes('__')) {
        checks.push({ type: 'custom-permission', value: val });
      } else {
        checks.push({ type: 'permission', value: val });
      }
    }
    return { condition: { operator: 'not', checks }, hasObjectAccess: false };
  }
  
  // Single permission checks
  if (attributes['permission']) {
    return { condition: { type: 'permission', value: attributes['permission'] }, hasObjectAccess: false };
  }
  
  if (attributes['custom-permission']) {
    return { condition: { type: 'custom-permission', value: attributes['custom-permission'] }, hasObjectAccess: false };
  }
  
  if (attributes['permission-set']) {
    return { condition: { type: 'permission-set', value: attributes['permission-set'] }, hasObjectAccess: false };
  }
  
  if (attributes['profile']) {
    return { condition: { type: 'profile', value: attributes['profile'] }, hasObjectAccess: false };
  }
  
  if (attributes['field']) {
    return { condition: { type: 'field', value: attributes['field'] }, hasObjectAccess: false };
  }
  
  if (attributes['object']) {
    const access = (attributes['access'] as 'read' | 'edit' | 'create' | 'delete' | 'viewAll' | 'modifyAll') || 'read';
    return { condition: { type: 'object', value: attributes['object'], access }, hasObjectAccess: true };
  }
  
  // Default: no permission check (shouldn't happen, but return a safe default)
  console.warn('[DocsUnlocked] No valid permission attribute found in :::if block');
  return { condition: { type: 'permission', value: '' }, hasObjectAccess: false };
}

/**
 * Process :::if permission blocks in markdown
 * Skips blocks inside code blocks
 */
export function processPermissionBlocks(content: string): PermissionBlock[] {
  const blocks: PermissionBlock[] = [];
  
  // Track fenced code blocks to skip permission blocks inside them
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
  // Pattern: :::if ... ::: or :::if ... :::else ... :::
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
      
      const { condition } = parsePermissionAttributes(blockStart);
      
      blocks.push({
        start: match.index,
        end: match.index + match[0].length,
        condition,
        content: blockContent,
        elseContent: elseContent,
        originalMatch: match[0]
      });
    }
  }
  
  return blocks;
}

/**
 * Replace permission blocks with placeholders that will be processed after permission checks
 * Note: Content is stored as markdown and will be parsed when the placeholder is processed
 */
export function replacePermissionBlocksWithPlaceholders(content: string, blocks: PermissionBlock[]): string {
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
    
    const placeholder = `<div class="permission-block-placeholder" data-condition='${conditionJson}' data-content='${contentEscaped}' data-else-content='${elseContentEscaped}'></div>`;
    
    result = result.substring(0, block.start) + placeholder + result.substring(block.end);
  }
  
  return result;
}
