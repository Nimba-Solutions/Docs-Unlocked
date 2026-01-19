/**
 * Hook to process permission-based conditional visibility blocks after rendering
 */

import React, { useEffect } from 'react';
import { marked } from 'marked';
import { checkPermission, checkPermissionCondition, PermissionCheck, PermissionCondition } from '../utils/permissions';

/**
 * Process permission block placeholders in the DOM
 */
export function usePermissionEffects(contentRef: React.RefObject<HTMLElement>, html: string): void {
  useEffect(() => {
    if (!contentRef.current || !html) return;
    
    const processPermissionBlocks = async () => {
      const placeholders = contentRef.current?.querySelectorAll('.permission-block-placeholder');
      
      if (!placeholders || placeholders.length === 0) return;
      
      for (const placeholder of Array.from(placeholders)) {
        const element = placeholder as HTMLElement;
        const conditionJson = element.getAttribute('data-condition');
        const content = element.getAttribute('data-content');
        const elseContent = element.getAttribute('data-else-content');
        
        if (!conditionJson || !content) continue;
        
        try {
          const condition = JSON.parse(conditionJson.replace(/&quot;/g, '"')) as PermissionCondition | PermissionCheck;
          
          // Check if it's a condition (with operator) or a single check
          let hasPermission = false;
          let isValid = true;
          
          if ('operator' in condition) {
            const result = await checkPermissionCondition(condition as PermissionCondition);
            hasPermission = result.hasPermission;
            isValid = result.isValid;
          } else {
            const result = await checkPermission(condition as PermissionCheck);
            hasPermission = result.hasPermission;
            isValid = result.isValid;
          }
          
          // If permission check failed (invalid permission), show error indicator
          if (!isValid) {
            const errorIcon = `
              <span class="permission-error-indicator inline-flex items-center ml-1" title="Invalid permission reference">
                <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </span>
            `;
            element.outerHTML = errorIcon;
            continue;
          }
          
          // If user has permission, show content; otherwise show else content or nothing
          if (hasPermission) {
            // Unescape content and parse as markdown
            const unescapedContent = content
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
            // Parse markdown to HTML
            const parsedHtml = marked.parse(unescapedContent) as string;
            element.outerHTML = parsedHtml;
          } else {
            // Show else content if available, otherwise remove (default behavior)
            if (elseContent) {
              // Unescape else content and parse as markdown
              const unescapedElseContent = elseContent
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
              // Parse markdown to HTML
              const parsedElseHtml = marked.parse(unescapedElseContent) as string;
              element.outerHTML = parsedElseHtml;
            } else {
              // Default: remove content (graceful degradation - leaves no trace)
              element.remove();
            }
          }
        } catch (error) {
          console.error('[DocsUnlocked] Error processing permission block:', error);
          // On error, remove the block (graceful degradation)
          element.remove();
        }
      }
      
      // Process header modifiers
      await processHeaderModifiers();
    };
    
    const processHeaderModifiers = async () => {
      const headers = contentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      if (!headers) return;
      
      for (const header of Array.from(headers)) {
        const element = header as HTMLElement;
        const permissionAttr = element.getAttribute('data-permission-check');
        
        if (!permissionAttr) continue;
        
        try {
          const permissionCheck = JSON.parse(permissionAttr.replace(/&quot;/g, '"')) as PermissionCheck;
          const result = await checkPermission(permissionCheck);
          
          // If permission check failed (invalid permission), show error indicator
          if (!result.isValid) {
            const errorIcon = `
              <span class="permission-error-indicator inline-flex items-center ml-1" title="Invalid permission reference">
                <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </span>
            `;
            element.innerHTML = element.innerHTML + errorIcon;
            continue;
          }
          
          // If user doesn't have permission, hide the header
          if (!result.hasPermission) {
            element.style.display = 'none';
          }
        } catch (error) {
          console.error('[DocsUnlocked] Error processing header modifier:', error);
          // On error, show the header (fail open)
        }
      }
    };
    
    // Process after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      processPermissionBlocks();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [contentRef, html]);
}
