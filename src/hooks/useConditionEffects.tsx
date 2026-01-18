/**
 * Hook to process conditional visibility blocks after rendering
 * Generic foundation that supports any condition type via the condition registry
 */

import React, { useEffect } from 'react';
import { marked } from 'marked';
import { Condition, conditionRegistry, ConditionResult } from '../utils/conditions';

/**
 * Process condition block placeholders in the DOM
 */
export function useConditionEffects(contentRef: React.RefObject<HTMLElement>, html: string): void {
  useEffect(() => {
    if (!contentRef.current || !html) return;
    
    const processConditionBlocks = async () => {
      const placeholders = contentRef.current?.querySelectorAll('.condition-block-placeholder');
      
      if (!placeholders || placeholders.length === 0) {
        // Also check for old permission-block-placeholder for backward compatibility
        const oldPlaceholders = contentRef.current?.querySelectorAll('.permission-block-placeholder');
        if (!oldPlaceholders || oldPlaceholders.length === 0) {
          console.log('[DocsUnlocked] No condition blocks found');
          await processHeaderModifiers();
          return;
        }
        console.log('[DocsUnlocked] Found', oldPlaceholders.length, 'legacy permission blocks');
        // Process old placeholders the same way
        for (const placeholder of Array.from(oldPlaceholders)) {
          await processPlaceholder(placeholder as HTMLElement);
        }
        await processHeaderModifiers();
        return;
      }
      
      console.log('[DocsUnlocked] Processing', placeholders.length, 'condition blocks');
      
      for (const placeholder of Array.from(placeholders)) {
        await processPlaceholder(placeholder as HTMLElement);
      }
      
      // Process header modifiers
      await processHeaderModifiers();
    };
    
    const processPlaceholder = async (element: HTMLElement) => {
      const conditionJson = element.getAttribute('data-condition');
      const content = element.getAttribute('data-content');
      const elseContent = element.getAttribute('data-else-content');
      
      if (!conditionJson || !content) {
        console.warn('[DocsUnlocked] Condition block missing required attributes:', { conditionJson: !!conditionJson, content: !!content });
        return;
      }
      
      try {
        const condition = JSON.parse(conditionJson.replace(/&quot;/g, '"')) as Condition;
        
        console.log('[DocsUnlocked] Evaluating condition:', condition);
        
        // Evaluate condition using the registry
        const result: ConditionResult = await conditionRegistry.evaluate(condition);
        
        console.log('[DocsUnlocked] Condition result:', { 
          type: condition.type, 
          shouldShow: result.shouldShow, 
          isValid: result.isValid,
          hasElseContent: !!elseContent
        });
        
        // If condition check failed (invalid condition), show error indicator
        if (!result.isValid) {
          const errorMessage = result.error || 'Invalid condition reference';
          console.warn('[DocsUnlocked] Invalid condition:', condition, 'Error:', errorMessage);
          const errorIcon = `
            <span class="condition-error-indicator inline-flex items-center ml-1" title="${errorMessage}">
              <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </span>
          `;
          element.outerHTML = errorIcon;
          return;
        }
        
        // If condition passes, show content; otherwise show else content or nothing
        if (result.shouldShow) {
          console.log('[DocsUnlocked] Showing content for condition:', condition.type);
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
            console.log('[DocsUnlocked] Showing else content for condition:', condition.type);
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
            console.log('[DocsUnlocked] Hiding content (no else block) for condition:', condition.type);
            // Default: remove content (graceful degradation - leaves no trace)
            element.remove();
          }
        }
      } catch (error) {
        console.error('[DocsUnlocked] Error processing condition block:', error, 'Condition JSON:', conditionJson);
        // On error, remove the block (graceful degradation)
        element.remove();
      }
    };
    
    const processHeaderModifiers = async () => {
      const headers = contentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      if (!headers) {
        console.log('[DocsUnlocked] No headers found');
        return;
      }
      
      let headerModifierCount = 0;
      
      for (const header of Array.from(headers)) {
        const element = header as HTMLElement;
        // Check for both new and old attribute names for backward compatibility
        const conditionAttr = element.getAttribute('data-condition-check') || 
                             element.getAttribute('data-permission-check');
        
        if (!conditionAttr) continue;
        
        headerModifierCount++;
        
        try {
          const condition = JSON.parse(conditionAttr.replace(/&quot;/g, '"')) as Condition;
          const headerText = element.textContent || 'unknown';
          
          console.log('[DocsUnlocked] Evaluating header modifier:', { header: headerText, condition });
          
          const result: ConditionResult = await conditionRegistry.evaluate(condition);
          
          console.log('[DocsUnlocked] Header modifier result:', { 
            header: headerText,
            type: condition.type, 
            shouldShow: result.shouldShow, 
            isValid: result.isValid
          });
          
          // If condition check failed (invalid condition), show error indicator
          if (!result.isValid) {
            const errorMessage = result.error || 'Invalid condition reference';
            console.warn('[DocsUnlocked] Invalid header condition:', condition, 'Error:', errorMessage);
            const errorIcon = `
              <span class="condition-error-indicator inline-flex items-center ml-1" title="${errorMessage}">
                <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </span>
            `;
            element.innerHTML = element.innerHTML + errorIcon;
            continue;
          }
          
          // If condition doesn't pass, hide the header
          if (!result.shouldShow) {
            console.log('[DocsUnlocked] Hiding header:', headerText);
            element.style.display = 'none';
          } else {
            console.log('[DocsUnlocked] Showing header:', headerText);
          }
        } catch (error) {
          console.error('[DocsUnlocked] Error processing header modifier:', error, 'Attribute:', conditionAttr);
          // On error, show the header (fail open)
        }
      }
      
      if (headerModifierCount > 0) {
        console.log('[DocsUnlocked] Processed', headerModifierCount, 'header modifiers');
      }
    };
    
    // Process after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      processConditionBlocks();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [contentRef, html]);
}
