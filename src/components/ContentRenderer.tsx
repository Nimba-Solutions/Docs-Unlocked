import React, { useRef, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { TOCItem } from '../types';
import { parseNavCards, wrapCodeBlocks } from '../utils/markdown';
import { processCallouts, processNavCardsPlaceholders, injectNavCardsPlaceholders } from '../utils/markdownProcessing';
import { processImages, processVideos } from '../utils/mediaProcessing';
import { extractTOCAndAddIds } from '../utils/tocExtraction';
import { 
  useCopyButtons, 
  useNavCardRendering, 
  useInternalLinks,
  useLightningLinks, 
  useSearchHighlight 
} from '../hooks/useContentEffects';

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

  // Parse markdown to HTML and sanitize it
  const html = useMemo(() => {
    if (!content) return '';
    try {
      // Step 1: Process markdown extensions (callouts, navcards placeholders)
      let processedContent = processNavCardsPlaceholders(content);
      processedContent = processCallouts(processedContent);

      // Step 2: Parse markdown to HTML
      const rawHtml = marked.parse(processedContent) as string;
      
      // Step 3: Inject NavCard placeholders
      let htmlWithNavCards = injectNavCardsPlaceholders(rawHtml, navCards);
      
      // Step 4: Process media (images and videos)
      let htmlWithMedia = processImages(htmlWithNavCards);
      htmlWithMedia = processVideos(htmlWithMedia);
      
      // Step 5: Wrap code blocks with copy button
      const wrappedHtml = wrapCodeBlocks(htmlWithMedia);
      
      // Step 6: Extract TOC and add IDs to headers
      const htmlWithIds = extractTOCAndAddIds(wrappedHtml, onTOCChange);
      
      // Step 7: Sanitize HTML
      return DOMPurify.sanitize(htmlWithIds, {
        ADD_TAGS: ['video', 'source', 'iframe'],
        ADD_ATTR: ['controls', 'aria-label', 'id', 'frameborder', 'allow', 'allowfullscreen', 'style']
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[DocsUnlocked] Error rendering markdown: ${errorMsg}`);
      return `<p>Error rendering markdown: ${DOMPurify.sanitize(errorMsg)}</p>`;
    }
  }, [content, navCards, onTOCChange]);

  // Use hooks for DOM effects
  useCopyButtons(contentRef, html);
  useNavCardRendering(contentRef, html, onNavigate);
  useInternalLinks(contentRef, html, onNavigate);
  useLightningLinks(contentRef, html);
  useSearchHighlight(contentRef, html, highlightQuery);

  return (
    <div 
      ref={contentRef}
      className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-4xl prose-h1:sm:text-5xl prose-h1:mb-4 prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-gray-800 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:shadow-lg prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-li:text-gray-700 prose-li:mb-2 prose-li:has-input:text-gray-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
