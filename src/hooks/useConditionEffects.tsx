/**
 * Hook to process conditional visibility blocks after rendering
 * Generic foundation that supports any condition type via the condition registry
 */

import React, { useEffect } from 'react';
import { marked } from 'marked';
import { Condition, conditionRegistry, ConditionResult } from '../utils/conditions';
import { processCallouts, processNavCardsPlaceholders } from '../utils/markdownProcessing';

/**
 * Process condition block placeholders in the DOM
 */
export function useConditionEffects(contentRef: React.RefObject<HTMLElement>, html: string): void {
  useEffect(() => {
    if (!contentRef.current || !html) return;
    
    const processConditionBlocks = async () => {
      // Process placeholders iteratively until none remain (handles nested blocks)
      let iterations = 0;
      const MAX_ITERATIONS = 10; // Safety limit
      
      while (iterations < MAX_ITERATIONS) {
        const placeholders = contentRef.current?.querySelectorAll('.condition-block-placeholder');
        
        if (!placeholders || placeholders.length === 0) {
          // Also check for old permission-block-placeholder for backward compatibility
          const oldPlaceholders = contentRef.current?.querySelectorAll('.permission-block-placeholder');
          if (!oldPlaceholders || oldPlaceholders.length === 0) {
            break; // No more placeholders to process
          }
          // Process old placeholders
          for (const placeholder of Array.from(oldPlaceholders)) {
            await processPlaceholder(placeholder as HTMLElement);
          }
          break;
        }
        
        console.log('[DocsUnlocked] Processing', placeholders.length, 'condition blocks (iteration', iterations + 1, ')');
        
        for (const placeholder of Array.from(placeholders)) {
          await processPlaceholder(placeholder as HTMLElement);
        }
        
        iterations++;
      }
      
      if (iterations >= MAX_ITERATIONS) {
        console.warn('[DocsUnlocked] Max iterations reached processing condition blocks');
      }
      
      // Process header modifiers after all condition blocks
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
        
        console.log('[DocsUnlocked] Evaluating condition:', JSON.stringify(condition, null, 2));
        
        // Evaluate condition using the registry
        const result: ConditionResult = await conditionRegistry.evaluate(condition);
        
        console.log('[DocsUnlocked] Condition result:', JSON.stringify({ 
          type: condition.type, 
          shouldShow: result.shouldShow, 
          isValid: result.isValid,
          hasElseContent: !!elseContent,
          error: result.error
        }, null, 2));
        
        // If condition check failed (invalid condition), show error indicator
        if (!result.isValid) {
          const errorMessage = result.error || 'Invalid condition reference';
          console.warn('[DocsUnlocked] Invalid condition:', JSON.stringify(condition, null, 2), 'Error:', errorMessage);
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
          const unescapedContent = unescapeContent(content);
          
          console.log('[DocsUnlocked] Unescaped content preview:', unescapedContent.substring(0, 100));
          
          // Process markdown extensions (callouts, navcards) before parsing
          const processedContent = processMarkdownExtensions(unescapedContent.trim());
          
          // Parse markdown to HTML
          const parsedHtml = marked.parse(processedContent) as string;
          
          console.log('[DocsUnlocked] Parsed HTML preview:', parsedHtml.substring(0, 200));
          
          // Replace the placeholder element with the parsed HTML
          element.outerHTML = parsedHtml;
        } else {
          // Show else content if available, otherwise remove (default behavior)
          console.log('[DocsUnlocked] Condition failed, checking else content.');
          
          if (elseContent && elseContent.trim().length > 0) {
            console.log('[DocsUnlocked] Showing else content for condition:', condition.type);
            const unescapedElseContent = unescapeContent(elseContent);
            
            console.log('[DocsUnlocked] Unescaped else content preview:', unescapedElseContent.substring(0, 100));
            
            // Process markdown extensions (callouts, navcards) before parsing
            const processedElseContent = processMarkdownExtensions(unescapedElseContent.trim());
            
            // Parse markdown to HTML
            const parsedElseHtml = marked.parse(processedElseContent) as string;
            
            console.log('[DocsUnlocked] Parsed else HTML preview:', parsedElseHtml.substring(0, 200));
            
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
          const headerLevel = parseInt(element.tagName.substring(1), 10);
          
          console.log('[DocsUnlocked] Evaluating header modifier:', JSON.stringify({ header: headerText, level: headerLevel, condition }, null, 2));
          
          const result: ConditionResult = await conditionRegistry.evaluate(condition);
          
          console.log('[DocsUnlocked] Header modifier result:', JSON.stringify({ 
            header: headerText,
            type: condition.type, 
            shouldShow: result.shouldShow, 
            isValid: result.isValid
          }, null, 2));
          
          // If condition check failed (invalid condition), show error indicator
          if (!result.isValid) {
            const errorMessage = result.error || 'Invalid condition reference';
            console.warn('[DocsUnlocked] Invalid header condition:', JSON.stringify(condition, null, 2), 'Error:', errorMessage);
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
          
          // If condition doesn't pass, hide the header AND its following content
          if (!result.shouldShow) {
            console.log('[DocsUnlocked] Hiding header section:', headerText);
            hideHeaderSection(element, headerLevel);
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
    
    /**
     * Hide a header and all content until the next header of same or higher level
     */
    const hideHeaderSection = (headerElement: HTMLElement, headerLevel: number) => {
      // Hide the header itself
      headerElement.style.display = 'none';
      
      // Hide all following siblings until we hit a header of same or higher level
      let sibling = headerElement.nextElementSibling;
      while (sibling) {
        const tagName = sibling.tagName.toLowerCase();
        
        // Check if it's a header
        if (/^h[1-6]$/.test(tagName)) {
          const siblingLevel = parseInt(tagName.substring(1), 10);
          // Stop if we hit a header of same or higher level (lower number)
          if (siblingLevel <= headerLevel) {
            break;
          }
        }
        
        // Hide this element
        (sibling as HTMLElement).style.display = 'none';
        sibling = sibling.nextElementSibling;
      }
    };
    
    /**
     * Unescape HTML entities in content
     */
    const unescapeContent = (content: string): string => {
      return content
        .replace(/&#10;/g, '\n')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');
    };
    
    /**
     * Process markdown extensions (callouts, navcards) before parsing
     */
    const processMarkdownExtensions = (content: string): string => {
      let processed = content;
      processed = processNavCardsPlaceholders(processed);
      processed = processCallouts(processed);
      return processed;
    };
    
    // Process after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      processConditionBlocks();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [contentRef, html]);
}
