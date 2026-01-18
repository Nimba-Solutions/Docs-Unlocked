/**
 * Permission checking utilities for Salesforce
 * Supports standard permissions, custom permissions, permission sets, profiles, object access, and field access
 */

export interface PermissionCheck {
  type: 'permission' | 'custom-permission' | 'permission-set' | 'profile' | 'object' | 'field';
  value: string;
  access?: 'read' | 'edit' | 'create' | 'delete' | 'viewAll' | 'modifyAll';
}

export interface PermissionCondition {
  operator: 'all' | 'any' | 'not';
  checks: PermissionCheck[];
}

// Cache for permission checks to avoid repeated API calls
const permissionCache = new Map<string, boolean>();
const cacheTimestamp = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
 * Generate cache key for a permission check
 */
function getCacheKey(check: PermissionCheck): string {
  return `${check.type}:${check.value}${check.access ? `:${check.access}` : ''}`;
}

/**
 * Check if user has a standard permission
 */
async function checkStandardPermission(permission: string): Promise<boolean> {
  const cacheKey = getCacheKey({ type: 'permission', value: permission });
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
  const cacheKey = getCacheKey({ type: 'custom-permission', value: permission });
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
  const cacheKey = getCacheKey({ type: 'permission-set', value: permissionSet });
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
  const cacheKey = getCacheKey({ type: 'profile', value: profile });
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
  const cacheKey = getCacheKey({ type: 'object', value: objectName, access });
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
  const cacheKey = getCacheKey({ type: 'field', value: fieldName });
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
 * Check a single permission check
 */
export async function checkPermission(check: PermissionCheck): Promise<{ hasPermission: boolean; isValid: boolean }> {
  try {
    let hasPermission = false;
    
    switch (check.type) {
      case 'permission':
        hasPermission = await checkStandardPermission(check.value);
        break;
      case 'custom-permission':
        hasPermission = await checkCustomPermission(check.value);
        break;
      case 'permission-set':
        hasPermission = await checkPermissionSet(check.value);
        break;
      case 'profile':
        hasPermission = await checkProfile(check.value);
        break;
      case 'object':
        if (!check.access) {
          console.warn(`[DocsUnlocked] Object access check requires "access" attribute. Defaulting to "read".`);
          check.access = 'read';
        }
        hasPermission = await checkObjectAccess(check.value, check.access);
        break;
      case 'field':
        hasPermission = await checkFieldAccess(check.value);
        break;
      default:
        console.warn(`[DocsUnlocked] Unknown permission type: ${(check as any).type}`);
        return { hasPermission: false, isValid: false };
    }
    
    return { hasPermission, isValid: true };
  } catch (error) {
    console.error(`[DocsUnlocked] Error checking permission:`, error);
    return { hasPermission: false, isValid: false };
  }
}

/**
 * Check a permission condition (with logical operators)
 */
export async function checkPermissionCondition(condition: PermissionCondition): Promise<{ hasPermission: boolean; isValid: boolean }> {
  if (condition.checks.length === 0) {
    return { hasPermission: true, isValid: true };
  }
  
  const results = await Promise.all(
    condition.checks.map(check => checkPermission(check))
  );
  
  const allValid = results.every(r => r.isValid);
  if (!allValid) {
    return { hasPermission: false, isValid: false };
  }
  
  const permissionResults = results.map(r => r.hasPermission);
  
  switch (condition.operator) {
    case 'all':
      return { hasPermission: permissionResults.every(r => r), isValid: true };
    case 'any':
      return { hasPermission: permissionResults.some(r => r), isValid: true };
    case 'not':
      return { hasPermission: !permissionResults[0], isValid: true };
    default:
      console.warn(`[DocsUnlocked] Unknown operator: ${condition.operator}`);
      return { hasPermission: false, isValid: false };
  }
}

/**
 * Clear permission cache (useful for testing or when user permissions change)
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
  cacheTimestamp.clear();
}
