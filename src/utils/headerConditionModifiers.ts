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
 * Find all headers with condition modifiers
 * Format: ## Header {permissions="..."} or ## Header {condition="..."}
 */
export function findHeaderModifiers(content: string): HeaderModifier[] {
  const modifiers: HeaderModifier[] = [];
  
  // Match headers with modifiers: ## Title {permissions="..."} or {condition="..."}
  // This regex matches headers (H1-H6) with optional modifiers at the end
  const headerRegex = /^(#{1,6})\s+(.+?)\s*\{([^}]+)\}\s*$/gm;
  
  let match;
  headerRegex.lastIndex = 0;
  
  while ((match = headerRegex.exec(content)) !== null) {
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
 */
export function removeHeaderModifiers(content: string): string {
  // Remove {permissions="..."} style modifiers from headers
  return content.replace(/^(#{1,6})\s+(.+?)\s*\{[^}]+\}\s*$/gm, (_match, level, title) => {
    return `${level} ${title.trim()}`;
  });
}
