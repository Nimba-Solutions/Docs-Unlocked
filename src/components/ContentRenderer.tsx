import React, { useRef, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { TOCItem } from '../types';
import { parseNavCards, wrapCodeBlocks } from '../utils/markdown';
import { processCallouts, processNavCardsPlaceholders, injectNavCardsPlaceholders } from '../utils/markdownProcessing';
import { processImages, processVideos } from '../utils/mediaProcessing';
import { extractTOCAndAddIds } from '../utils/tocExtraction';
import { parseFrontmatter } from '../utils/frontmatter';
import { processConditionBlocks, replaceConditionBlocksWithPlaceholders } from '../utils/conditionProcessing';
import { findHeaderModifiers, removeHeaderModifiers } from '../utils/headerConditionModifiers';
import '../utils/permissionConditions'; // Import to register permission conditions
import { 
  useCopyButtons, 
  useNavCardRendering, 
  useInternalLinks,
  useLightningLinks, 
  useSearchHighlight 
} from '../hooks/useContentEffects';
import { useConditionEffects } from '../hooks/useConditionEffects';

interface ContentRendererProps {
  content: string;
  onNavigate?: (path: string) => void;
  highlightQuery?: string;
  onTOCChange?: (toc: TOCItem[]) => void;
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({ 
  content, 
  onNavigate, 
  highlightQuery, 
  onTOCChange 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse NavCards from markdown before rendering
  const navCards = useMemo(() => {
    const cards = parseNavCards(content);
    if (cards.length > 0) {
      console.log(`[DocsUnlocked] Parsed ${cards.length} navcards:`, cards);
    }
    return cards;
  }, [content]);

  // Parse frontmatter and extract visibility rules
  const { contentWithoutFrontmatter } = useMemo(() => {
    const parsed = parseFrontmatter(content);
    if (parsed) {
      return { contentWithoutFrontmatter: parsed.content };
    }
    return { contentWithoutFrontmatter: content };
  }, [content]);

  // Parse markdown to HTML and sanitize it
  const html = useMemo(() => {
    if (!contentWithoutFrontmatter) return '';
    try {
      // Step 0: Process condition blocks and header modifiers (before markdown parsing)
      const conditionBlocks = processConditionBlocks(contentWithoutFrontmatter);
      let processedContent = replaceConditionBlocksWithPlaceholders(contentWithoutFrontmatter, conditionBlocks);
      
      // Process header modifiers - remove modifiers from headers but store them for later
      const headerModifiers = findHeaderModifiers(processedContent);
      processedContent = removeHeaderModifiers(processedContent);
      
      // Step 1: Process markdown extensions (callouts, navcards placeholders)
      processedContent = processNavCardsPlaceholders(processedContent);
      processedContent = processCallouts(processedContent);

      // Step 2: Parse markdown to HTML
      // Condition block divs are already in place - marked.parse preserves HTML
      const rawHtml = marked.parse(processedContent) as string;
      
      // Step 2.5: Add condition check attributes to headers that had modifiers
      let htmlWithHeaderModifiers = rawHtml;
      for (const modifier of headerModifiers) {
        // Find the header in the HTML and add data-condition-check attribute
        // Use [\s\S]*? to match any content including inline HTML tags like <code>, <em>, <strong>
        const escapedContent = modifier.headerContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const headerRegex = new RegExp(`<h([1-6])([^>]*)>([\\s\\S]*?${escapedContent}[\\s\\S]*?)</h\\1>`, 'i');
        htmlWithHeaderModifiers = htmlWithHeaderModifiers.replace(headerRegex, (_match, level, attrs, content) => {
          const conditionJson = JSON.stringify(modifier.condition).replace(/"/g, '&quot;');
          return `<h${level}${attrs} data-condition-check="${conditionJson}">${content}</h${level}>`;
        });
      }
      
      // Step 3: Inject NavCard placeholders
      let htmlWithNavCards = injectNavCardsPlaceholders(htmlWithHeaderModifiers, navCards);
      
      // Step 4: Process media (images and videos)
      let htmlWithMedia = processImages(htmlWithNavCards);
      htmlWithMedia = processVideos(htmlWithMedia);
      
      // Step 5: Wrap code blocks with copy button
      const wrappedHtml = wrapCodeBlocks(htmlWithMedia);
      
      // Step 6: Extract TOC and add IDs to headers
      const htmlWithIds = extractTOCAndAddIds(wrappedHtml, onTOCChange);
      
      // Step 7: Sanitize HTML (allow condition-related attributes)
      return DOMPurify.sanitize(htmlWithIds, {
        ADD_TAGS: ['video', 'source', 'iframe'],
        ADD_ATTR: ['controls', 'aria-label', 'id', 'frameborder', 'allow', 'allowfullscreen', 'style', 'data-condition', 'data-content', 'data-else-content', 'data-condition-check', 'data-permission-check', 'class', 'title']
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[DocsUnlocked] Error rendering markdown: ${errorMsg}`);
      return `<p>Error rendering markdown: ${DOMPurify.sanitize(errorMsg)}</p>`;
    }
  }, [contentWithoutFrontmatter, navCards, onTOCChange]);

  // Use hooks for DOM effects
  useCopyButtons(contentRef, html);
  useNavCardRendering(contentRef, html, onNavigate);
  useInternalLinks(contentRef, html, onNavigate);
  useLightningLinks(contentRef, html);
  useSearchHighlight(contentRef, html, highlightQuery);
  useConditionEffects(contentRef, html);

  return (
    <div 
      ref={contentRef}
      className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-4xl prose-h1:sm:text-5xl prose-h1:mb-4 prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-gray-800 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:shadow-lg prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-li:text-gray-700 prose-li:mb-2 prose-li:has-input:text-gray-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
