/**
 * Process header-level permission modifiers
 * Format: ## Header Title {permissions="..."} or ## Header Title {custom-permission="..."}
 */

import { PermissionCheck } from './permissions';

export interface HeaderModifier {
  headerMatch: string;
  headerLevel: string;
  headerContent: string;
  permissionCheck: PermissionCheck;
  originalMatch: string;
}

/**
 * Parse permission attributes from header modifier
 * Format: {permissions="..."} or {custom-permission="..."} etc.
 */
function parseHeaderPermissionAttribute(modifier: string): PermissionCheck | null {
  // Extract attributes from {key="value"} format
  const attrRegex = /(\w+(?:-\w+)*)=["']([^"']+)["']/g;
  const attributes: Record<string, string> = {};
  let match;
  
  while ((match = attrRegex.exec(modifier)) !== null) {
    attributes[match[1]] = match[2];
  }
  
  // Check for permission types
  if (attributes['permission'] || attributes['permissions']) {
    const perm = attributes['permission'] || attributes['permissions'];
    return { type: 'permission', value: perm };
  }
  
  if (attributes['custom-permission']) {
    return { type: 'custom-permission', value: attributes['custom-permission'] };
  }
  
  if (attributes['permission-set']) {
    return { type: 'permission-set', value: attributes['permission-set'] };
  }
  
  if (attributes['profile']) {
    return { type: 'profile', value: attributes['profile'] };
  }
  
  if (attributes['field']) {
    return { type: 'field', value: attributes['field'] };
  }
  
  if (attributes['object']) {
    const access = (attributes['access'] as 'read' | 'edit' | 'create' | 'delete' | 'viewAll' | 'modifyAll') || 'read';
    return { type: 'object', value: attributes['object'], access };
  }
  
  return null;
}

/**
 * Find all headers with permission modifiers
 * Format: ## Header {permissions="..."}
 */
export function findHeaderModifiers(content: string): HeaderModifier[] {
  const modifiers: HeaderModifier[] = [];
  
  // Match headers with modifiers: ## Title {permissions="..."}
  // This regex matches headers (H1-H6) with optional modifiers at the end
  const headerRegex = /^(#{1,6})\s+(.+?)\s*\{([^}]+)\}\s*$/gm;
  
  let match;
  headerRegex.lastIndex = 0;
  
  while ((match = headerRegex.exec(content)) !== null) {
    const level = match[1];
    const headerContent = match[2].trim();
    const modifier = match[3];
    
    const permissionCheck = parseHeaderPermissionAttribute(modifier);
    
    if (permissionCheck) {
      modifiers.push({
        headerMatch: match[0],
        headerLevel: level,
        headerContent,
        permissionCheck,
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
