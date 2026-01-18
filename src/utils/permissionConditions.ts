/**
 * Permission-based conditions implementation
 * Built on top of the generic condition foundation
 */

import { Condition, ConditionResult, conditionRegistry, LogicalCondition } from './conditions';

/**
 * Permission check types
 */
export type PermissionType = 
  | 'permission' 
  | 'custom-permission' 
  | 'permission-set' 
  | 'profile' 
  | 'object' 
  | 'field';

/**
 * Permission-based condition
 */
export interface PermissionCondition extends Condition {
  type: 'permission';
  permissionType: PermissionType;
  value: string;
  access?: 'read' | 'edit' | 'create' | 'delete' | 'viewAll' | 'modifyAll';
}

/**
 * Cache for permission checks to avoid repeated API calls
 */
const permissionCache = new Map<string, boolean>();
const cacheTimestamp = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key for a permission check
 */
function getCacheKey(check: PermissionCondition): string {
  return `permission:${check.permissionType}:${check.value}${check.access ? `:${check.access}` : ''}`;
}

/**
 * Check if a permission check result is cached and still valid
 */
function getCachedPermission(key: string): boolean | null {
  const cached = permissionCache.get(key);
  const timestamp = cacheTimestamp.get(key);
  
  if (cached !== undefined && timestamp !== undefined) {
    const age = Date.now() - timestamp;
    if (age < CACHE_TTL) {
      return cached;
    }
    // Cache expired, remove it
    permissionCache.delete(key);
    cacheTimestamp.delete(key);
  }
  
  return null;
}

/**
 * Cache a permission check result
 */
function setCachedPermission(key: string, result: boolean): void {
  permissionCache.set(key, result);
  cacheTimestamp.set(key, Date.now());
}

/**
 * Check if user has a standard permission
 */
async function checkStandardPermission(permission: string): Promise<boolean> {
  const cacheKey = `permission:${permission}`;
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) return cached;
  
  try {
    // Use Salesforce UserInfo API if available
    if (typeof (window as any).sf !== 'undefined' && (window as any).sf.UserInfo) {
      const hasPermission = await (window as any).sf.UserInfo.hasPermission(permission);
      setCachedPermission(cacheKey, hasPermission);
      return hasPermission;
    }
    
    // Fallback: Use Lightning Platform API
    if (typeof (window as any).Lightning !== 'undefined' && (window as any).Lightning.UserInfo) {
      const hasPermission = await (window as any).Lightning.UserInfo.hasPermission(permission);
      setCachedPermission(cacheKey, hasPermission);
      return hasPermission;
    }
    
    // If no Salesforce context available, return false and log warning
    console.warn(`[DocsUnlocked] Permission check for "${permission}" - Salesforce context not available. Content will be hidden.`);
    setCachedPermission(cacheKey, false);
    return false;
  } catch (error) {
    console.error(`[DocsUnlocked] Error checking permission "${permission}":`, error);
    setCachedPermission(cacheKey, false);
    return false;
  }
}

/**
 * Check if user has a custom permission
 */
async function checkCustomPermission(permission: string): Promise<boolean> {
  const cacheKey = `custom-permission:${permission}`;
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) return cached;
  
  try {
    // Use Salesforce UserInfo API for custom permissions
    if (typeof (window as any).sf !== 'undefined' && (window as any).sf.UserInfo) {
      const hasPermission = await (window as any).sf.UserInfo.hasCustomPermission(permission);
      setCachedPermission(cacheKey, hasPermission);
      return hasPermission;
    }
    
    // Fallback: Use Lightning Platform API
    if (typeof (window as any).Lightning !== 'undefined' && (window as any).Lightning.UserInfo) {
      const hasPermission = await (window as any).Lightning.UserInfo.hasCustomPermission(permission);
      setCachedPermission(cacheKey, hasPermission);
      return hasPermission;
    }
    
    console.warn(`[DocsUnlocked] Custom permission check for "${permission}" - Salesforce context not available. Content will be hidden.`);
    setCachedPermission(cacheKey, false);
    return false;
  } catch (error) {
    console.error(`[DocsUnlocked] Error checking custom permission "${permission}":`, error);
    setCachedPermission(cacheKey, false);
    return false;
  }
}

/**
 * Check if user has a permission set assigned
 */
async function checkPermissionSet(permissionSet: string): Promise<boolean> {
  const cacheKey = `permission-set:${permissionSet}`;
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) return cached;
  
  try {
    // Permission sets need to be checked via Apex or UserInfo
    // For now, we'll use a callback if available, otherwise return false
    if (typeof (window as any).DOCS_CHECK_PERMISSION_SET === 'function') {
      const hasPermissionSet = await (window as any).DOCS_CHECK_PERMISSION_SET(permissionSet);
      setCachedPermission(cacheKey, hasPermissionSet);
      return hasPermissionSet;
    }
    
    console.warn(`[DocsUnlocked] Permission set check for "${permissionSet}" - DOCS_CHECK_PERMISSION_SET not available. Content will be hidden.`);
    setCachedPermission(cacheKey, false);
    return false;
  } catch (error) {
    console.error(`[DocsUnlocked] Error checking permission set "${permissionSet}":`, error);
    setCachedPermission(cacheKey, false);
    return false;
  }
}

/**
 * Check if user has a specific profile
 */
async function checkProfile(profile: string): Promise<boolean> {
  const cacheKey = `profile:${profile}`;
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) return cached;
  
  try {
    // Check profile name via UserInfo
    if (typeof (window as any).sf !== 'undefined' && (window as any).sf.UserInfo) {
      const userProfile = await (window as any).sf.UserInfo.getProfileName();
      const matches = userProfile === profile;
      setCachedPermission(cacheKey, matches);
      return matches;
    }
    
    // Fallback: Use Lightning Platform API
    if (typeof (window as any).Lightning !== 'undefined' && (window as any).Lightning.UserInfo) {
      const userProfile = await (window as any).Lightning.UserInfo.getProfileName();
      const matches = userProfile === profile;
      setCachedPermission(cacheKey, matches);
      return matches;
    }
    
    console.warn(`[DocsUnlocked] Profile check for "${profile}" - Salesforce context not available. Content will be hidden.`);
    setCachedPermission(cacheKey, false);
    return false;
  } catch (error) {
    console.error(`[DocsUnlocked] Error checking profile "${profile}":`, error);
    setCachedPermission(cacheKey, false);
    return false;
  }
}

/**
 * Check if user has access to an object
 */
async function checkObjectAccess(objectName: string, access: 'read' | 'edit' | 'create' | 'delete' | 'viewAll' | 'modifyAll'): Promise<boolean> {
  const cacheKey = `object:${objectName}:${access}`;
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) return cached;
  
  try {
    // Use Salesforce UserInfo API for object access
    if (typeof (window as any).sf !== 'undefined' && (window as any).sf.UserInfo) {
      let hasAccess = false;
      switch (access) {
        case 'read':
          hasAccess = await (window as any).sf.UserInfo.hasObjectAccess(objectName, 'read');
          break;
        case 'edit':
          hasAccess = await (window as any).sf.UserInfo.hasObjectAccess(objectName, 'edit');
          break;
        case 'create':
          hasAccess = await (window as any).sf.UserInfo.hasObjectAccess(objectName, 'create');
          break;
        case 'delete':
          hasAccess = await (window as any).sf.UserInfo.hasObjectAccess(objectName, 'delete');
          break;
        case 'viewAll':
          hasAccess = await (window as any).sf.UserInfo.hasObjectAccess(objectName, 'viewAll');
          break;
        case 'modifyAll':
          hasAccess = await (window as any).sf.UserInfo.hasObjectAccess(objectName, 'modifyAll');
          break;
      }
      setCachedPermission(cacheKey, hasAccess);
      return hasAccess;
    }
    
    console.warn(`[DocsUnlocked] Object access check for "${objectName}" (${access}) - Salesforce context not available. Content will be hidden.`);
    setCachedPermission(cacheKey, false);
    return false;
  } catch (error) {
    console.error(`[DocsUnlocked] Error checking object access "${objectName}" (${access}):`, error);
    setCachedPermission(cacheKey, false);
    return false;
  }
}

/**
 * Check if user has access to a field
 */
async function checkFieldAccess(fieldName: string): Promise<boolean> {
  const cacheKey = `field:${fieldName}`;
  const cached = getCachedPermission(cacheKey);
  if (cached !== null) return cached;
  
  try {
    // Use Salesforce UserInfo API for field access
    if (typeof (window as any).sf !== 'undefined' && (window as any).sf.UserInfo) {
      const hasAccess = await (window as any).sf.UserInfo.hasFieldAccess(fieldName);
      setCachedPermission(cacheKey, hasAccess);
      return hasAccess;
    }
    
    console.warn(`[DocsUnlocked] Field access check for "${fieldName}" - Salesforce context not available. Content will be hidden.`);
    setCachedPermission(cacheKey, false);
    return false;
  } catch (error) {
    console.error(`[DocsUnlocked] Error checking field access "${fieldName}":`, error);
    setCachedPermission(cacheKey, false);
    return false;
  }
}

/**
 * Evaluate a permission condition
 */
async function evaluatePermissionCondition(
  condition: Condition
): Promise<ConditionResult> {
  const permCondition = condition as PermissionCondition;
  const cacheKey = getCacheKey(permCondition);
  const cached = getCachedPermission(cacheKey);
  
  if (cached !== null) {
    return { shouldShow: cached, isValid: true };
  }
  
  try {
    let hasPermission = false;
    
    switch (permCondition.permissionType) {
      case 'permission':
        hasPermission = await checkStandardPermission(permCondition.value);
        break;
      case 'custom-permission':
        hasPermission = await checkCustomPermission(permCondition.value);
        break;
      case 'permission-set':
        hasPermission = await checkPermissionSet(permCondition.value);
        break;
      case 'profile':
        hasPermission = await checkProfile(permCondition.value);
        break;
      case 'object':
        if (!permCondition.access) {
          console.warn(`[DocsUnlocked] Object access check requires "access" attribute. Defaulting to "read".`);
          permCondition.access = 'read';
        }
        hasPermission = await checkObjectAccess(permCondition.value, permCondition.access);
        break;
      case 'field':
        hasPermission = await checkFieldAccess(permCondition.value);
        break;
      default:
        return {
          shouldShow: false,
          isValid: false,
          error: `Unknown permission type: ${(permCondition as any).permissionType}`
        };
    }
    
    setCachedPermission(cacheKey, hasPermission);
    return { shouldShow: hasPermission, isValid: true };
  } catch (error) {
    console.error(`[DocsUnlocked] Error evaluating permission condition:`, error);
    return {
      shouldShow: false,
      isValid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Parse permission attributes from :::if block
 */
function parsePermissionCondition(attributes: Record<string, string>): PermissionCondition | null {
  // Single permission checks
  if (attributes['permission']) {
    return {
      type: 'permission',
      permissionType: 'permission',
      value: attributes['permission']
    };
  }
  
  if (attributes['custom-permission']) {
    return {
      type: 'permission',
      permissionType: 'custom-permission',
      value: attributes['custom-permission']
    };
  }
  
  if (attributes['permission-set']) {
    return {
      type: 'permission',
      permissionType: 'permission-set',
      value: attributes['permission-set']
    };
  }
  
  if (attributes['profile']) {
    return {
      type: 'permission',
      permissionType: 'profile',
      value: attributes['profile']
    };
  }
  
  if (attributes['field']) {
    return {
      type: 'permission',
      permissionType: 'field',
      value: attributes['field']
    };
  }
  
  if (attributes['object']) {
    const access = (attributes['access'] as 'read' | 'edit' | 'create' | 'delete' | 'viewAll' | 'modifyAll') || 'read';
    return {
      type: 'permission',
      permissionType: 'object',
      value: attributes['object'],
      access
    };
  }
  
  return null;
}

/**
 * Parse logical operators (all, any, not) for permissions
 */
function parsePermissionLogicalOperator(attributes: Record<string, string>): LogicalCondition | null {
  // Check for logical operators
  if (attributes['all']) {
    const values = attributes['all'].split(',').map(v => v.trim()).filter(v => v);
    const conditions: PermissionCondition[] = [];
    for (const val of values) {
      // Try to infer type from common patterns
      if (val.includes('__')) {
        conditions.push({ type: 'permission', permissionType: 'custom-permission', value: val });
      } else {
        conditions.push({ type: 'permission', permissionType: 'permission', value: val });
      }
    }
    return { type: 'logical', operator: 'all', conditions };
  }
  
  if (attributes['any']) {
    const values = attributes['any'].split(',').map(v => v.trim()).filter(v => v);
    const conditions: PermissionCondition[] = [];
    for (const val of values) {
      if (val.includes('__')) {
        conditions.push({ type: 'permission', permissionType: 'custom-permission', value: val });
      } else {
        conditions.push({ type: 'permission', permissionType: 'permission', value: val });
      }
    }
    return { type: 'logical', operator: 'any', conditions };
  }
  
  if (attributes['not']) {
    const values = attributes['not'].split(',').map(v => v.trim()).filter(v => v);
    const conditions: PermissionCondition[] = [];
    for (const val of values) {
      if (val.includes('__')) {
        conditions.push({ type: 'permission', permissionType: 'custom-permission', value: val });
      } else {
        conditions.push({ type: 'permission', permissionType: 'permission', value: val });
      }
    }
    return { type: 'logical', operator: 'not', conditions };
  }
  
  return null;
}

/**
 * Parse attributes - tries logical operators first, then single permissions
 */
function parsePermissionAttributes(attributes: Record<string, string>): Condition | null {
  // Try logical operators first
  const logical = parsePermissionLogicalOperator(attributes);
  if (logical) {
    return logical;
  }
  
  // Then try single permission checks
  return parsePermissionCondition(attributes);
}

// Register permission condition evaluator and parser
conditionRegistry.register('permission', evaluatePermissionCondition, parsePermissionAttributes);

/**
 * Clear permission cache (useful for testing or when user permissions change)
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
  cacheTimestamp.clear();
}

// PermissionCondition is already exported above
