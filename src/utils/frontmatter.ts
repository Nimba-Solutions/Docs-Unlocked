/**
 * Parse frontmatter from markdown files
 * Supports YAML frontmatter for page-level visibility rules
 */

import yaml from 'js-yaml';
import { LogicalCondition } from './conditions';
import { PermissionCondition } from './permissionConditions';

export interface FrontmatterVisibility {
  requireAll?: PermissionCondition[];
  requireAny?: PermissionCondition[];
  requireNot?: PermissionCondition[];
}

export interface Frontmatter {
  title?: string;
  visibility?: FrontmatterVisibility;
  [key: string]: any;
}

/**
 * Extract and parse frontmatter from markdown content
 * Returns { frontmatter, content } or null if no frontmatter
 */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter; content: string } | null {
  // Check for YAML frontmatter (--- delimiters)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return null;
  }
  
  try {
    const yamlContent = match[1];
    const markdownContent = match[2];
    
    const frontmatter = yaml.load(yamlContent) as Frontmatter;
    
    // Convert visibility rules to permission conditions
    // For now, we'll store the raw checks and convert them when checking
    // This allows us to support the frontmatter format while using our permission system
    
    return { frontmatter, content: markdownContent };
  } catch (error) {
    console.error('[DocsUnlocked] Error parsing frontmatter:', error);
    return null;
  }
}

/**
 * Convert frontmatter visibility rules to logical conditions
 */
export function convertVisibilityToCondition(visibility: FrontmatterVisibility): LogicalCondition | null {
  if (visibility.requireAll && visibility.requireAll.length > 0) {
    return { type: 'logical', operator: 'all', conditions: visibility.requireAll };
  }
  
  if (visibility.requireAny && visibility.requireAny.length > 0) {
    return { type: 'logical', operator: 'any', conditions: visibility.requireAny };
  }
  
  if (visibility.requireNot && visibility.requireNot.length > 0) {
    return { type: 'logical', operator: 'not', conditions: visibility.requireNot };
  }
  
  return null;
}
