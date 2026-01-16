import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Menu, X, Search, Github, ChevronRight, ChevronLeft } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import yaml from 'js-yaml';
import './index.css';

// NavCard Component
const NavCard = ({ title, description, href, onNavigate }: { 
  title: string; 
  description: string; 
  href: string;
  onNavigate?: (path: string) => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(href);
    } else {
      window.location.hash = href;
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
      </div>
    </a>
  );
};

// Configure marked.js with same options as Markdown-Unlocked
marked.use({
  gfm: true,      // GitHub Flavored Markdown
  breaks: true    // Automatic line breaks
});

// Helper to parse NavCard definitions from markdown
const parseNavCards = (markdown: string): Array<{ title: string; description: string; href: string }> => {
  const navCards: Array<{ title: string; description: string; href: string }> = [];
  
  // Match :::navcards blocks
  const navCardsRegex = /:::navcards\s*\n([\s\S]*?)\n:::/g;
  const matches = markdown.matchAll(navCardsRegex);
  
  for (const match of matches) {
    const content = match[1];
    
    // Try YAML-like format first (title: ... description: ... href: ...)
    const yamlCards = content.split(/^---$/gm);
    
    for (const cardBlock of yamlCards) {
      const titleMatch = cardBlock.match(/^title:\s*(.+)$/m);
      const descMatch = cardBlock.match(/^description:\s*(.+)$/m);
      const hrefMatch = cardBlock.match(/^href:\s*(.+)$/m);
      
      if (titleMatch && descMatch && hrefMatch) {
        navCards.push({
          title: titleMatch[1].trim(),
          description: descMatch[1].trim(),
          href: hrefMatch[1].trim()
        });
        continue;
      }
      
      // Try markdown link format: - [Title](href) - Description
      const linkMatch = cardBlock.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)\s*-\s*(.+)$/m);
      if (linkMatch) {
        navCards.push({
          title: linkMatch[1].trim(),
          description: linkMatch[3].trim(),
          href: linkMatch[2].trim()
        });
      }
    }
  }
  
  return navCards;
};

// Helper to wrap code blocks with copy button (post-processing)
const wrapCodeBlocks = (html: string): string => {
  // Match <pre><code> blocks
  return html.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, codeContent) => {
    // Escape HTML entities for data attribute
    const escapedCode = codeContent
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    return `<div class="relative group code-block-wrapper">
      <div class="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button class="copy-code-btn px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded" data-code="${escapedCode}">
          Copy
        </button>
      </div>
      ${match}
    </div>`;
  });
};

// Content Renderer - renders markdown content using marked.js (same config as Markdown-Unlocked)
interface TOCItem {
  id: string;
  text: string;
  level: number;
}

const ContentRenderer = ({ content, onNavigate, highlightQuery, onTOCChange }: { content: string; onNavigate?: (path: string) => void; highlightQuery?: string; onTOCChange?: (toc: TOCItem[]) => void }) => {
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
      // Replace :::navcards blocks with placeholder divs before parsing
      let processedContent = content;
      const navCardsRegex = /:::navcards\s*\n([\s\S]*?)\n:::/g;
      processedContent = processedContent.replace(navCardsRegex, () => {
        return '<div class="navcards-container"></div>';
      });

      // Process GitHub-style callouts before parsing
      // Format: > [!NOTE] ... or > [!IMPORTANT] ... etc.
      // Match blockquotes that start with [!TYPE] and continue until next non-blockquote line
      processedContent = processedContent.replace(/^>\s*\[!([A-Z]+)\]\s*\n((?:>.*\n?)*)/gm, (_match, type, content) => {
        const calloutTypes: Record<string, { bg: string; border: string; icon: string; title: string }> = {
          'NOTE': { bg: 'bg-blue-50', border: 'border-blue-200', icon: '💡', title: 'Note' },
          'TIP': { bg: 'bg-green-50', border: 'border-green-200', icon: '💡', title: 'Tip' },
          'IMPORTANT': { bg: 'bg-yellow-50', border: 'border-yellow-300', icon: '⚠️', title: 'Important' },
          'WARNING': { bg: 'bg-orange-50', border: 'border-orange-300', icon: '⚠️', title: 'Warning' },
          'CAUTION': { bg: 'bg-red-50', border: 'border-red-300', icon: '⚠️', title: 'Caution' }
        };
        const callout = calloutTypes[type] || calloutTypes['NOTE'];
        // Remove > prefix from each line and trim
        const cleanContent = content.replace(/^>\s?/gm, '').trim();
        return `\n<div class="callout ${callout.bg} ${callout.border} border-l-4 rounded-lg p-4 my-4">\n<div class="flex items-center gap-2 mb-1">\n<span class="text-lg flex-shrink-0">${callout.icon}</span>\n<p class="font-semibold text-gray-900 m-0">${callout.title}</p>\n</div>\n<div class="text-gray-700">${cleanContent}</div>\n</div>\n`;
      });

      // Also convert existing "Important:" patterns to callouts (standalone or in paragraphs)
      processedContent = processedContent.replace(/\*\*Important:\*\*\s*([^\n]+)/g, (_match, text) => {
        return `\n<div class="callout bg-yellow-50 border-yellow-300 border-l-4 rounded-lg p-4 my-4">\n<div class="flex items-center gap-2 mb-1">\n<span class="text-lg flex-shrink-0">⚠️</span>\n<p class="font-semibold text-gray-900 m-0">Important</p>\n</div>\n<div class="text-gray-700"><strong>Important:</strong> ${text}</div>\n</div>\n`;
      });

      // marked.parse() returns a string (synchronous) in the version we're using
      const rawHtml = marked.parse(processedContent) as string;
      
      // Replace navcards container with actual NavCard HTML
      let htmlWithNavCards = rawHtml;
      const navCardsContainerRegex = /<div\s+class="navcards-container"[^>]*><\/div>/g;
      htmlWithNavCards = htmlWithNavCards.replace(navCardsContainerRegex, () => {
        const cardsHtml = navCards.map((card, idx) => 
          `<div class="navcard-placeholder" data-title="${card.title.replace(/"/g, '&quot;')}" data-description="${card.description.replace(/"/g, '&quot;')}" data-href="${card.href.replace(/"/g, '&quot;')}" data-index="${idx}"></div>`
        ).join('');
        return `<div class="navcards-grid grid sm:grid-cols-2 gap-4">${cardsHtml}</div>`;
      });
      
      // Process images and videos - convert paths to StaticResource URLs
      const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
      let htmlWithMedia = htmlWithNavCards;
      
      // Process images: convert relative paths to StaticResource URLs
      htmlWithMedia = htmlWithMedia.replace(/<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
        // Skip if already absolute URL (http/https) or data URI
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
          return match;
        }
        
        // Normalize path - remove leading ./ or ../
        let normalizedPath = src.replace(/^\.\//, '').replace(/^\.\.\//, '');
        if (!normalizedPath.startsWith('/')) {
          normalizedPath = '/' + normalizedPath;
        }
        
        // Check if path starts with /media/ - if so, use media folder, otherwise use content folder
        let staticResourceUrl: string;
        if (normalizedPath.startsWith('/media/')) {
          // Strip /media/ prefix since we're already in the media folder
          const mediaPath = normalizedPath.replace(/^\/media\//, '');
          staticResourceUrl = `/resource/${contentResourceName}/media/${mediaPath}`;
        } else {
          staticResourceUrl = `/resource/${contentResourceName}/content${normalizedPath}`;
        }
        return `<img${before} src="${staticResourceUrl}"${after}>`;
      });
      
      // Process videos: detect video file extensions and convert to <video> tags
      // Support both markdown image syntax for videos and explicit video syntax
      const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i;
      
      // Convert image tags with video extensions to video tags
      // Note: Videos must be hosted externally (Salesforce Files or public URLs) due to 5MB StaticResource limit
      htmlWithMedia = htmlWithMedia.replace(/<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
        // Extract alt text from the img tag
        const altMatch = before.match(/alt=["']([^"']*)["']/i) || after.match(/alt=["']([^"']*)["']/i);
        const altText = altMatch ? altMatch[1] : '';
        
        // Check for YouTube URLs
        const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const youtubeMatch = src.match(youtubeRegex);
        if (youtubeMatch) {
          const videoId = youtubeMatch[1];
          return `<div class="my-4"><iframe class="w-full rounded-lg" style="aspect-ratio: 16/9; height: auto;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen${altText ? ` title="${altText}"` : ''}></iframe></div>`;
        }
        
        // Check for Vimeo URLs
        const vimeoRegex = /vimeo\.com\/(\d+)/;
        const vimeoMatch = src.match(vimeoRegex);
        if (vimeoMatch) {
          const videoId = vimeoMatch[1];
          return `<div class="my-4"><iframe class="w-full rounded-lg" style="aspect-ratio: 16/9; height: auto;" src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen${altText ? ` title="${altText}"` : ''}></iframe></div>`;
        }
        
        // Check if it's a video file extension
        if (!videoExtensions.test(src)) {
          return match; // Not a video, return as-is
        }
        
        // If already absolute URL (http/https), use it directly
        if (src.startsWith('http://') || src.startsWith('https://')) {
          const extension = src.split('.').pop()?.toLowerCase() || 'mp4';
          const mimeTypes: Record<string, string> = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'mkv': 'video/x-matroska'
          };
          const mimeType = mimeTypes[extension] || 'video/mp4';
          return `<video controls class="w-full rounded-lg my-4"${altText ? ` aria-label="${altText}"` : ''}><source src="${src}" type="${mimeType}">Your browser does not support the video tag.</video>`;
        }
        
        // For relative paths, show a warning message instead of trying to load from StaticResource
        // (StaticResources have a 5MB limit, so videos should be hosted externally)
        return `<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4"><p class="text-sm text-yellow-800"><strong>Video not supported in StaticResources:</strong> Videos must be hosted externally (Salesforce Files or public URLs) due to Salesforce's 5MB StaticResource size limit. Use an absolute URL like <code>https://your-domain.com/video.mp4</code> or a Salesforce Files URL.</p></div>`;
      });
      
      // Also support explicit video syntax: ![video](path.mp4) or <video src="path.mp4"></video>
      htmlWithMedia = htmlWithMedia.replace(/<video([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
        // Skip if already absolute URL
        if (src.startsWith('http://') || src.startsWith('https://')) {
          return match;
        }
        
        // Normalize path
        let normalizedPath = src.replace(/^\.\//, '').replace(/^\.\.\//, '');
        if (!normalizedPath.startsWith('/')) {
          normalizedPath = '/' + normalizedPath;
        }
        
        // Check if path starts with /media/ - if so, use media folder, otherwise use content folder
        let staticResourceUrl: string;
        if (normalizedPath.startsWith('/media/')) {
          // Strip /media/ prefix since we're already in the media folder
          const mediaPath = normalizedPath.replace(/^\/media\//, '');
          staticResourceUrl = `/resource/${contentResourceName}/media/${mediaPath}`;
        } else {
          staticResourceUrl = `/resource/${contentResourceName}/content${normalizedPath}`;
        }
        return `<video${before} src="${staticResourceUrl}"${after}>`;
      });
      
      // Wrap code blocks with copy button before sanitizing
      const wrappedHtml = wrapCodeBlocks(htmlWithMedia);
      
      // Add IDs to headers and extract TOC
      const toc: TOCItem[] = [];
      // Use a more robust regex that handles headers with nested HTML
      const htmlWithIds = wrappedHtml.replace(/<h([1-4])([^>]*)>([\s\S]*?)<\/h[1-4]>/gi, (_match, level, attrs, content) => {
        // Extract text content from HTML (remove HTML tags using regex)
        const text = content.replace(/<[^>]*>/g, '').trim();
        
        if (!text) return _match; // Skip empty headers
        
        // Generate ID from text (lowercase, replace spaces with hyphens, remove special chars)
        const id = text.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        
        if (id) {
          toc.push({
            id,
            text: text,
            level: parseInt(level)
          });
          
          // Check if ID already exists in attrs
          const hasId = attrs.includes('id=');
          if (hasId) {
            // Replace existing ID
            return `<h${level}${attrs.replace(/id=["'][^"']*["']/i, `id="${id}"`)}>${content}</h${level}>`;
          } else {
            return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
          }
        }
        
        return _match; // Return unchanged if no valid ID
      });
      
      // Notify parent of TOC changes
      if (onTOCChange) {
        onTOCChange(toc);
      }
      
      return DOMPurify.sanitize(htmlWithIds, {
        ADD_TAGS: ['video', 'source', 'iframe'],
        ADD_ATTR: ['controls', 'aria-label', 'id', 'frameborder', 'allow', 'allowfullscreen', 'style']
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[DocsUnlocked] Error rendering markdown: ${errorMsg}`);
      return `<p>Error rendering markdown: ${DOMPurify.sanitize(errorMsg)}</p>`;
    }
  }, [content, navCards]);

  // Attach copy button handlers after render
  useEffect(() => {
    if (!contentRef.current) return;

    const copyButtons = contentRef.current.querySelectorAll('.copy-code-btn');
    const cleanupFunctions: Array<() => void> = [];

    copyButtons.forEach((button) => {
      const handleClick = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const code = (button as HTMLElement).getAttribute('data-code');
        if (!code) return;

        try {
          // Decode HTML entities - create a temporary element to decode properly
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = code;
          const decodedCode = tempDiv.textContent || tempDiv.innerText || code;

          await navigator.clipboard.writeText(decodedCode);
          
          // Update button text temporarily
          const originalText = button.textContent;
          (button as HTMLElement).textContent = 'Copied!';
          (button as HTMLElement).classList.remove('bg-gray-700', 'hover:bg-gray-600');
          (button as HTMLElement).classList.add('bg-green-600');
          setTimeout(() => {
            if (button.textContent === 'Copied!') {
              (button as HTMLElement).textContent = originalText;
              (button as HTMLElement).classList.remove('bg-green-600');
              (button as HTMLElement).classList.add('bg-gray-700', 'hover:bg-gray-600');
            }
          }, 2000);
        } catch (err) {
          console.error('[DocsUnlocked] Failed to copy code:', err);
        }
      };

      button.addEventListener('click', handleClick);
      cleanupFunctions.push(() => {
        button.removeEventListener('click', handleClick);
      });
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [html]);

  // Replace NavCard placeholders with React components
  useEffect(() => {
    if (!contentRef.current) return;

    const placeholders = contentRef.current.querySelectorAll('.navcard-placeholder');
    console.log(`[DocsUnlocked] Found ${placeholders.length} navcard placeholders in DOM`);
    const cleanupFunctions: Array<() => void> = [];

    placeholders.forEach((placeholder) => {
      const title = placeholder.getAttribute('data-title');
      const description = placeholder.getAttribute('data-description');
      const href = placeholder.getAttribute('data-href');
      
      if (!title || !description || !href) return;

      // Create a container for the React component
      const container = document.createElement('div');
      placeholder.parentNode?.replaceChild(container, placeholder);

      // Render NavCard component
      const root = ReactDOM.createRoot(container);
      root.render(
        <NavCard 
          title={title} 
          description={description} 
          href={href}
          onNavigate={onNavigate}
        />
      );

      cleanupFunctions.push(() => {
        root.unmount();
      });
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [html, onNavigate]);

  // Highlight search query and scroll to first match
  useEffect(() => {
    if (!contentRef.current || !highlightQuery || !highlightQuery.trim()) return;

    const container = contentRef.current;
    const query = highlightQuery.trim();
    const lowerQuery = query.toLowerCase();
    
    // Find all text nodes that contain the query
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip code blocks and pre elements
          const parent = node.parentElement;
          if (parent && (parent.tagName === 'CODE' || parent.tagName === 'PRE' || parent.closest('pre'))) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const matches: Array<{ node: Text; index: number }> = [];
    let node: Node | null;
    
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      const lowerText = text.toLowerCase();
      const index = lowerText.indexOf(lowerQuery);
      if (index !== -1) {
        matches.push({ node: node as Text, index });
      }
    }

    if (matches.length === 0) return;

    // Highlight the first match
    const firstMatch = matches[0];
    const textNode = firstMatch.node;
    const text = textNode.textContent || '';
    const index = firstMatch.index;

    const beforeText = text.substring(0, index);
    const matchText = text.substring(index, index + query.length);
    const afterText = text.substring(index + query.length);

    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'bg-yellow-200 px-1 rounded font-semibold';
    highlightSpan.id = 'search-highlight';
    highlightSpan.textContent = matchText;

    const beforeNode = document.createTextNode(beforeText);
    const afterNode = document.createTextNode(afterText);

    const parentElement = textNode.parentNode;
    if (parentElement) {
      parentElement.replaceChild(beforeNode, textNode);
      parentElement.insertBefore(highlightSpan, beforeNode.nextSibling);
      parentElement.insertBefore(afterNode, highlightSpan.nextSibling);
    }

    // Scroll to highlight after a short delay to ensure DOM is updated
    const scrollTimeout = setTimeout(() => {
      const highlightEl = container.querySelector('#search-highlight');
      if (highlightEl) {
        highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    // Cleanup function - remove highlight after 5 seconds
    const cleanupTimeout = setTimeout(() => {
      const highlightEl = container.querySelector('#search-highlight');
      if (highlightEl && highlightEl.parentNode) {
        const text = highlightEl.textContent || '';
        const textNode = document.createTextNode(text);
        highlightEl.parentNode.replaceChild(textNode, highlightEl);
      }
    }, 5000);

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(cleanupTimeout);
      const highlightEl = container.querySelector('#search-highlight');
      if (highlightEl && highlightEl.parentNode) {
        const text = highlightEl.textContent || '';
        const textNode = document.createTextNode(text);
        highlightEl.parentNode.replaceChild(textNode, highlightEl);
      }
    };
  }, [html, highlightQuery]);

  return (
    <div 
      ref={contentRef}
      className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-4xl prose-h1:sm:text-5xl prose-h1:mb-4 prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-gray-800 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:shadow-lg prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-li:text-gray-700 prose-li:mb-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// Sidebar Navigation Component
const Sidebar = ({ 
  isOpen, 
  onClose, 
  navigation,
  currentPath,
  onNavigate,
  displayHeader,
  discoveredFiles
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  navigation: any[];
  currentPath: string;
  onNavigate: (path: string, searchQuery?: string) => void;
  displayHeader: boolean;
  discoveredFiles: Map<string, { title: string; path: string; displayPath: string; order: number }>;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ title: string; path: string; snippet: string; searchQuery?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Helper to check if an item matches the search query
  const matchesSearch = (item: any, query: string): boolean => {
    if (!query.trim()) return true;
    const lowerQuery = query.toLowerCase();
    return item.title.toLowerCase().includes(lowerQuery) ||
           (item.path && item.path.toLowerCase().includes(lowerQuery));
  };

  // Helper to filter items recursively
  const filterItems = (items: any[], query: string): any[] => {
    if (!query.trim()) return items;
    return items.filter(item => {
      const matches = matchesSearch(item, query);
      const hasMatchingChildren = item.children && filterItems(item.children, query).length > 0;
      return matches || hasMatchingChildren;
    }).map(item => ({
      ...item,
      children: item.children ? filterItems(item.children, query) : undefined
    }));
  };

  // Search through all content files - searches immediately as you type
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Clear previous timeout
    let cancelled = false;
    
    const searchAllContent = async () => {
      const query = searchQuery.toLowerCase();
      const results: Array<{ title: string; path: string; snippet: string; searchQuery?: string }> = [];
      
      // Get content resource name
      const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
      
      // Get all files from discoveredFiles (which has the actual StaticResource paths)
      const allFiles = Array.from(discoveredFiles.values());

      // Search through each content file
      for (const file of allFiles) {
        if (cancelled) break;
        
        try {
          // Use the actual StaticResource path (with prefixes)
          const contentPath = file.path.startsWith('/') ? `${file.path}.md` : `/${file.path}.md`;
          const url = `/resource/${contentResourceName}/content${contentPath}?t=${Date.now()}`;
          const response = await fetch(url, { cache: 'no-store' });
          
          if (response.ok) {
            const content = await response.text();
            if (content.length < 100) continue; // Skip invalid responses
            
            const lowerContent = content.toLowerCase();
            
            // Check if content matches
            if (lowerContent.includes(query) || file.title.toLowerCase().includes(query)) {
              // Find snippet around first match
              const index = lowerContent.indexOf(query);
              const start = Math.max(0, index - 100);
              const end = Math.min(content.length, index + query.length + 100);
              let snippet = content.substring(start, end);
              
              // Clean up snippet (remove markdown headers, code blocks, etc.)
              snippet = snippet.replace(/^#+\s+/gm, '').replace(/```[\s\S]*?```/g, '').trim();
              if (snippet.length > 200) {
                snippet = snippet.substring(0, 200) + '...';
              }
              
              results.push({
                title: file.title || file.displayPath.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || file.displayPath,
                path: file.displayPath,
                snippet: snippet || file.title,
                searchQuery: query // Store the search query for highlighting
              });
            }
          }
        } catch (error) {
          // Skip files that fail to load
          if (!cancelled) {
            console.warn(`[DocsUnlocked] Failed to search content for ${file.displayPath}:`, error);
          }
        }
      }
      
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    };

    // Debounce search - reduced to 100ms for faster response
    const timeoutId = setTimeout(searchAllContent, 100);
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchQuery, discoveredFiles]);

  const renderNavItems = (items: any[], level = 0, filteredItems?: any[]) => {
    const itemsToRender = filteredItems || items;
    return itemsToRender.map((item) => {
      const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
      return (
        <div key={item.path}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(item.path);
              onClose();
            }}
            className={`
              block px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer
              ${isActive
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
            style={{ paddingLeft: `${0.75 + level * 0.5}rem` }}
          >
            {item.title}
          </a>
          {item.children && item.children.length > 0 && (
            <div className="ml-2 mt-1">
              {renderNavItems(item.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      {isOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        absolute left-0 w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:absolute lg:left-0 lg:w-72 lg:transform-none lg:translate-x-0
      `} style={{
        top: displayHeader ? '124px' : '0px',
        bottom: 0,
        height: displayHeader ? 'calc(100% - 124px)' : '100%'
      }}>
        <div className="h-full overflow-y-auto p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded">Ctrl+K</kbd> or <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded">Cmd+K</kbd> to open search modal
            </p>
          </div>
          {searchQuery.trim() ? (
            <div className="space-y-4">
              {isSearching ? (
                <div className="text-sm text-gray-500 text-center py-4">Searching...</div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Search Results ({searchResults.length})
                  </div>
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <a
                        key={result.path}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(result.path, result.searchQuery);
                          onClose();
                        }}
                        className={`
                          block p-3 text-sm rounded-lg transition-colors cursor-pointer border border-gray-200 hover:border-blue-300 hover:bg-blue-50
                          ${currentPath === result.path
                            ? 'bg-blue-50 text-blue-700 border-blue-300' 
                            : 'text-gray-700 hover:text-gray-900'
                          }
                        `}
                      >
                        <div className="font-medium mb-1">{result.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">{result.snippet}</div>
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">No results found</div>
              )}
            </div>
          ) : (
            <nav className="space-y-8">
              {navigation.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {renderNavItems(section.children || [])}
                  </ul>
                </div>
              ))}
            </nav>
          )}
        </div>
      </aside>
    </>
  );
};

// Search Modal Component
const SearchModal = ({ 
  isOpen, 
  onClose, 
  discoveredFiles,
  onNavigate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  discoveredFiles: Map<string, { title: string; path: string; displayPath: string; order: number }>;
  onNavigate: (path: string, searchQuery?: string) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ title: string; path: string; snippet: string; searchQuery?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search through all content files
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    let cancelled = false;
    
    const searchAllContent = async () => {
      const query = searchQuery.toLowerCase();
      const results: Array<{ title: string; path: string; snippet: string; searchQuery?: string }> = [];
      
      const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
      
      // Get all files from discoveredFiles (which has the actual StaticResource paths)
      const allFiles = Array.from(discoveredFiles.values());

      // Search through each content file
      for (const file of allFiles) {
        if (cancelled) break;
        
        try {
          // Use the actual StaticResource path (with prefixes)
          const contentPath = file.path.startsWith('/') ? `${file.path}.md` : `/${file.path}.md`;
          const url = `/resource/${contentResourceName}/content${contentPath}?t=${Date.now()}`;
          const response = await fetch(url, { cache: 'no-store' });
          
          if (response.ok) {
            const content = await response.text();
            if (content.length < 100) continue; // Skip invalid responses
            
            const lowerContent = content.toLowerCase();
            
            if (lowerContent.includes(query) || file.title.toLowerCase().includes(query)) {
              const index = lowerContent.indexOf(query);
              const start = Math.max(0, index - 100);
              const end = Math.min(content.length, index + query.length + 100);
              let snippet = content.substring(start, end);
              
              snippet = snippet.replace(/^#+\s+/gm, '').replace(/```[\s\S]*?```/g, '').trim();
              if (snippet.length > 200) {
                snippet = snippet.substring(0, 200) + '...';
              }
              
              results.push({
                title: file.title || file.displayPath.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || file.displayPath,
                path: file.displayPath,
                snippet: snippet || file.title,
                searchQuery: query // Store the search query for highlighting
              });
            }
          }
        } catch (error) {
          if (!cancelled) {
            console.warn(`[DocsUnlocked] Failed to search content for ${file.displayPath}:`, error);
          }
        }
      }
      
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchAllContent, 100);
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchQuery, discoveredFiles]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && searchResults.length > 0 && !isSearching) {
        onNavigate(searchResults[0].path, searchResults[0].searchQuery);
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, searchResults, isSearching, onNavigate, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="absolute inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="absolute inset-0 z-50 flex items-start justify-center pt-[20%] px-4"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden transform transition-all duration-200"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">Esc</kbd>
              </div>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Searching...</div>
              </div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-400 mb-2">No results found</div>
                <div className="text-sm text-gray-500">Try a different search term</div>
              </div>
            ) : searchQuery.trim() && searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result, idx) => (
                  <a
                    key={result.path}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(result.path, result.searchQuery);
                      onClose();
                      setSearchQuery('');
                    }}
                    className={`
                      block p-4 rounded-lg transition-all cursor-pointer border-2
                      ${idx === 0
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 mb-1">{result.title}</div>
                        <div className="text-sm text-gray-600 line-clamp-2">{result.snippet}</div>
                        <div className="text-xs text-gray-400 mt-1 font-mono">{result.path}</div>
                      </div>
                      {idx === 0 && (
                        <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 bg-white border border-gray-300 rounded">Enter</kbd>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <div className="text-gray-500 mb-2">Start typing to search</div>
                <div className="text-sm text-gray-400">Search across all documentation content</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Helper to flatten navigation and get prev/next pages
const flattenNavigation = (nav: any[]): Array<{ title: string; path: string }> => {
  const result: Array<{ title: string; path: string }> = [];
  nav.forEach((section) => {
    if (section.children) {
      section.children.forEach((child: any) => {
        result.push({ title: child.title, path: child.path });
      });
    }
  });
  return result;
};

// Navigation Links Component (Prev/Next)
const NavigationLinks = ({ 
  navigation, 
  currentPath, 
  onNavigate,
  position = 'top'
}: { 
  navigation: any[]; 
  currentPath: string; 
  onNavigate: (path: string) => void;
  position?: 'top' | 'bottom';
}) => {
  const flatNav = useMemo(() => flattenNavigation(navigation), [navigation]);
  const currentIndex = flatNav.findIndex(item => item.path === currentPath);
  const prevPage = currentIndex > 0 ? flatNav[currentIndex - 1] : null;
  const nextPage = currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null;

  if (!prevPage && !nextPage) return null;

  const borderClass = position === 'top' 
    ? 'pb-8 mb-8 border-b border-gray-200' 
    : 'pt-8 mt-8 border-t border-gray-200';

  return (
    <div className={`flex items-center justify-between ${borderClass}`}>
      <div className="text-sm">
        {prevPage ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(prevPage.path);
            }}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>
              <span className="text-gray-500">Previous:</span> {prevPage.title}
            </span>
          </a>
        ) : (
          <div className="text-gray-400">← Previous</div>
        )}
      </div>
      <div className="text-sm">
        {nextPage ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(nextPage.path);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 group"
          >
            <span>
              <span className="text-gray-500">Next:</span> {nextPage.title}
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        ) : (
          <div className="text-gray-400">Next →</div>
        )}
      </div>
    </div>
  );
};

// Main App Component
const DocsApp = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [navigation, setNavigation] = useState<any[]>([]);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TOCItem[]>([]);
  const articleRef = useRef<HTMLElement>(null);
  
  // Get configuration from window (set by LWC)
  const displayHeader = (window as any).DOCS_DISPLAY_HEADER === true; // Default to false
  const headerLabel = (window as any).DOCS_HEADER_LABEL || 'Documentation';
  const displayFooter = (window as any).DOCS_DISPLAY_FOOTER !== false; // Default to true

  // Keyboard shortcut handler for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Runtime discovery: Build navigation by trying to fetch files dynamically
  const [discoveredFiles, setDiscoveredFiles] = useState<Map<string, { title: string; path: string; displayPath: string; order: number }>>(new Map());
  
  // Extract title from markdown content
  const extractTitle = (content: string): string => {
    const h1Match = content.match(/^#\s+(.+)$/m);
    return h1Match ? h1Match[1].trim() : '';
  };
  
  // Normalize a path by removing numeric prefixes (e.g., "02.core-concepts/02.configuration" -> "/core-concepts/configuration")
  const normalizeDisplayPath = (path: string): string => {
    if (!path) return '';
    // Ensure it starts with /
    const normalized = path.startsWith('/') ? path : '/' + path;
    // Split and remove numeric prefixes from each segment
    const parts = normalized.split('/').filter(p => p).map(part => {
      const match = part.match(/^\d+[.-](.+)$/);
      return match ? match[1] : part;
    });
    return '/' + parts.join('/');
  };
  
  
  // Build navigation structure from discovered files
  const buildNavigationFromDiscovered = (files: Map<string, { title: string; path: string; displayPath: string; order: number }>) => {
    const sections: Record<string, { order: number; children: Array<{ title: string; path: string; displayPath: string; order: number }> }> = {};
    
    files.forEach((file) => {
      const pathParts = file.displayPath.split('/').filter(p => p);
      if (pathParts.length >= 2) {
        const sectionName = pathParts[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (!sections[sectionName]) {
          // Get order from first file in section
          const sectionOrder = file.order;
          sections[sectionName] = { order: sectionOrder, children: [] };
        }
        sections[sectionName].children.push({
          title: file.title,
          path: file.path, // Use actual path for fetching
          displayPath: file.displayPath,
          order: file.order
        });
      }
    });
    
    return Object.entries(sections)
      .map(([sectionName, sectionData]) => ({
        title: sectionName,
        path: sectionData.children[0]?.displayPath.split('/').slice(0, 2).join('/') || '',
        order: sectionData.order,
        children: sectionData.children
          .sort((a, b) => a.order - b.order)
          .map(child => ({
            title: child.title,
            path: child.displayPath // Use displayPath for navigation (without prefixes)
          }))
      }))
      .sort((a, b) => a.order - b.order);
  };
  
  // Load navigation from manifest.json
  useEffect(() => {
    const loadNavigation = async () => {
      try {
        const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
        const manifestUrl = `/resource/${contentResourceName}/content/manifest.yaml`;
        
        console.log(`[DocsUnlocked] Loading manifest from: ${manifestUrl}`);
        const response = await fetch(manifestUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
        }
        
        const yamlText = await response.text();
        const manifest = yaml.load(yamlText) as any;
        console.log(`[DocsUnlocked] === SECTIONS IN STATIC RESOURCE (from manifest) ===`);
        
        const filesMap = new Map<string, { title: string; path: string; displayPath: string; order: number }>();
        const nav: Array<{ title: string; path: string; order: number; children: Array<{ title: string; path: string }> }> = [];
        
        let sectionOrder = 1;
        Object.entries(manifest).forEach(([sectionName, files]: [string, any]) => {
          const sectionTitle = sectionName.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          console.log(`[DocsUnlocked]   ${sectionTitle} (${files.length} files)`);
          
          const navChildren: Array<{ title: string; path: string }> = [];
          
          files.forEach((file: any, index: number) => {
            console.log(`[DocsUnlocked]     ${file.path} -> StaticResource: ${file.file}`);
            filesMap.set(file.path, {
              title: file.title,
              path: file.file.replace(/\.md$/, ''),
              displayPath: file.path,
              order: sectionOrder * 1000 + index
            });
            
            navChildren.push({
              title: file.title,
              path: file.path
            });
          });
          
          nav.push({
            title: sectionTitle,
            path: `/${sectionName}`,
            order: sectionOrder,
            children: navChildren
          });
          
          sectionOrder++;
        });
        
        console.log(`[DocsUnlocked] === END MANIFEST SECTIONS ===`);
        
        setDiscoveredFiles(filesMap);
        setNavigation(nav);
        
        // Set default path if no hash is present
        if (!window.location.hash && nav.length > 0 && nav[0].children.length > 0) {
          const firstPath = nav[0].children[0].path;
          console.log(`[DocsUnlocked] No hash found, setting default path: ${firstPath}`);
          setCurrentPath(firstPath);
        }
      } catch (error) {
        console.error(`[DocsUnlocked] Failed to load manifest:`, error);
      } finally {
        setLoading(false);
      }
    };
    
    loadNavigation();
  }, []);
  
  // Update navigation when discovered files change
  useEffect(() => {
    if (discoveredFiles.size > 0) {
      const nav = buildNavigationFromDiscovered(discoveredFiles);
      setNavigation(nav);
    }
  }, [discoveredFiles]);

  // Load markdown content
  useEffect(() => {
    const loadContent = async () => {
      if (!currentPath || discoveredFiles.size === 0) return;
      
      setContentLoading(true);
      try {
        // Get content resource name from window (set by LWC) or use default
        const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
        
        // Use the actual path from discovered files - we already know it!
        const existingFile = discoveredFiles.get(currentPath);
        let response: Response;
        let text = '';
        let foundPath = '';
        
        if (!existingFile) {
          console.error(`[DocsUnlocked] File not found in manifest for displayPath: ${currentPath}`);
          console.error(`[DocsUnlocked] Available files:`, Array.from(discoveredFiles.keys()));
          throw new Error(`File not found in manifest: ${currentPath}`);
        }
        
        // Use the path from manifest (should have prefixes like "02.core-concepts/01.basic-usage")
        const contentPath = existingFile.path.startsWith('/') ? `${existingFile.path}.md` : `/${existingFile.path}.md`;
        const url = `/resource/${contentResourceName}/content${contentPath}`;
        console.log(`[DocsUnlocked] Loading content from manifest:`);
        console.log(`[DocsUnlocked]   Display path: ${currentPath}`);
        console.log(`[DocsUnlocked]   StaticResource path: ${existingFile.path}`);
        console.log(`[DocsUnlocked]   Full URL: ${url}`);
        
        // Add cache-busting query parameter to force fresh fetch
        const cacheBustUrl = `${url}?t=${Date.now()}`;
        response = await fetch(cacheBustUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[DocsUnlocked] HTTP ${response.status} error from ${url}:`, errorText.substring(0, 200));
          throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }
        
        text = await response.text();
        console.log(`[DocsUnlocked] Raw response length: ${text.length} chars`);
        console.log(`[DocsUnlocked] Response preview (first 200 chars):`, text.substring(0, 200));
        
        if (text.length < 100) {
          console.error(`[DocsUnlocked] Content too short (${text.length} chars) from ${url}. Full response:`, text);
          throw new Error(`Content too short from ${url} (${text.length} chars)`);
        }
        foundPath = existingFile.path;
        
        // Update title if we haven't loaded it yet
        if (!existingFile.title) {
          const title = extractTitle(text) || currentPath.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || currentPath;
          setDiscoveredFiles(prev => {
            const newMap = new Map(prev);
            // Update by displayPath (the key we use)
            const file = newMap.get(currentPath);
            if (file) {
              newMap.set(currentPath, { ...file, title });
            }
            return newMap;
          });
        }
        
        console.log(`[DocsUnlocked] Content loaded: ${currentPath} -> ${foundPath}, length: ${text.length} chars`);
        setContent(text);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
        console.error(`[DocsUnlocked] Failed to load content for path "${currentPath}": ${errorMsg}`);
        setContent(`# Content Not Found\n\nUnable to load content for path: \`${currentPath}\`\n\n**Expected location:**\n- ZIP StaticResource: \`/resource/${contentResourceName}/content${currentPath}.md\`\n- Or single StaticResource: \`/resource/${currentPath.replace(/^\//, '').replace(/\//g, '_')}\`\n\nPlease ensure the \`${contentResourceName}\` ZIP StaticResource is deployed with all content files.`);
      } finally {
        setContentLoading(false);
      }
    };
    
    loadContent();
  }, [currentPath, discoveredFiles]);

  const [highlightQuery, setHighlightQuery] = useState<string>('');

  const handleNavigate = (path: string, searchQuery?: string) => {
    setCurrentPath(path);
    setHighlightQuery(searchQuery || '');
    // Update URL hash for bookmarking
    window.location.hash = path;
  };

  // Scroll to top when path changes, or scroll to anchor if hash is present
  useEffect(() => {
    // Wait for content to load before scrolling
    if (contentLoading) return;
    
    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      const hash = window.location.hash.replace('#', '');
      
      // Check if hash contains :: separator (page path::anchor)
      const parts = hash.split('::');
      let anchorId: string | null = null;
      if (parts.length === 2) {
        anchorId = parts[1];
      } else if (hash && !hash.startsWith('/') && !discoveredFiles.has(hash) && !discoveredFiles.has(normalizeDisplayPath(hash))) {
        // It's an anchor ID only (not a page path)
        anchorId = hash;
      }
      
      // If we have an anchor ID, scroll to it
      if (anchorId) {
        const contentContainer = articleRef.current?.querySelector('.prose');
        const anchorElement = contentContainer?.querySelector(`#${anchorId}`) || document.getElementById(anchorId);
        if (anchorElement) {
          // Remove any existing highlight
          const existingHighlight = contentContainer?.querySelector('.toc-highlight');
          if (existingHighlight) {
            existingHighlight.classList.remove('toc-highlight', 'bg-yellow-200', 'px-1', 'rounded', 'font-semibold');
          }
          // Add highlight
          anchorElement.classList.add('toc-highlight', 'bg-yellow-200', 'px-1', 'rounded', 'font-semibold');
          anchorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Remove highlight after 5 seconds
          setTimeout(() => {
            anchorElement.classList.remove('toc-highlight', 'bg-yellow-200', 'px-1', 'rounded', 'font-semibold');
          }, 5000);
          return;
        }
      }
      
      // Otherwise, scroll to top
      // Find the scrollable container (could be window or a parent element)
      const scrollContainer = articleRef.current?.closest('[data-scroll-container]') || 
                             articleRef.current?.closest('main') ||
                             articleRef.current?.parentElement?.parentElement || 
                             window;
      
      // Scroll to absolute top
      if (scrollContainer === window) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (scrollContainer instanceof HTMLElement) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [currentPath, contentLoading, discoveredFiles]);

  // Handle initial hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      // Check if hash contains :: separator (page path::anchor)
      const parts = hash.split('::');
      if (parts.length === 2) {
        const [pagePath, anchorId] = parts;
        // Normalize and set page path
        const normalizedPath = normalizeDisplayPath(pagePath);
        console.log(`[DocsUnlocked] Setting initial path from hash: ${pagePath} -> ${normalizedPath}, anchor: ${anchorId}`);
        setCurrentPath(normalizedPath);
        // Anchor scrolling will be handled after content loads
      } else {
        // Check if hash is a page path (starts with /) or exists in discoveredFiles
        if (hash.startsWith('/') || discoveredFiles.has(hash) || discoveredFiles.has(normalizeDisplayPath(hash))) {
          // Normalize hash path (remove numeric prefixes) to match manifest displayPath
          const normalizedHash = normalizeDisplayPath(hash);
          console.log(`[DocsUnlocked] Setting initial path from hash: ${hash} -> ${normalizedHash}`);
          setCurrentPath(normalizedHash);
        } else {
          // It's an anchor ID only - load default page first, then scroll to anchor
          console.log(`[DocsUnlocked] Hash appears to be an anchor ID only: ${hash}`);
          // Set default path if navigation is available, otherwise let it use current/default
          if (navigation.length > 0 && navigation[0].children.length > 0) {
            const firstPath = navigation[0].children[0].path;
            console.log(`[DocsUnlocked] Loading default page for anchor-only hash: ${firstPath}`);
            setCurrentPath(firstPath);
          }
          // Anchor scrolling will be handled after content loads
        }
      }
    } else {
      console.log(`[DocsUnlocked] No hash found, using default path: ${currentPath}`);
    }
  }, [discoveredFiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50" style={{ height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
      {displayHeader && (
        <header className="absolute left-0 right-0 h-16 bg-white border-b border-gray-200 z-50" style={{ top: '60px' }}>
          <div className="h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
                <span className="text-xl font-bold text-gray-900">{headerLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </button>
            </div>
          </div>
        </header>
      )}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        navigation={navigation}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        displayHeader={displayHeader}
        discoveredFiles={discoveredFiles}
      />
      <main className="lg:absolute lg:left-72 lg:right-80 lg:overflow-y-auto" style={{
        top: displayHeader ? '124px' : '0px',
        bottom: 0,
        height: displayHeader ? 'calc(100% - 124px)' : '100%'
      }}>
        <article ref={articleRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6 lg:pt-8 lg:pb-8">
          {contentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading content...</div>
            </div>
          ) : (
            <>
              <NavigationLinks 
                navigation={navigation}
                currentPath={currentPath}
                onNavigate={handleNavigate}
                position="top"
              />
              <ContentRenderer content={content} onNavigate={handleNavigate} highlightQuery={highlightQuery} onTOCChange={setTableOfContents} />
              <NavigationLinks 
                navigation={navigation}
                currentPath={currentPath}
                onNavigate={handleNavigate}
                position="bottom"
              />
            </>
          )}
        </article>
      </main>
      {displayFooter && (
        <footer className="border-t border-gray-200 bg-white py-6 mt-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-4 md:px-6 lg:px-8">
            <div className="text-center text-sm text-gray-600">
              <p>Documentation powered by Docs Unlocked</p>
            </div>
          </div>
        </footer>
      )}
      
      {/* Right Sidebar - Table of Contents */}
      {tableOfContents.length > 0 && (
        <aside className="hidden lg:block lg:absolute lg:right-0 w-80 bg-white border-l border-gray-200 z-30" style={{
          top: displayHeader ? '124px' : '0px',
          bottom: 0,
          height: displayHeader ? 'calc(100% - 124px)' : '100%'
        }}>
          <div className="h-full overflow-y-auto p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              On This Page
            </h3>
            <nav className="space-y-1">
              {tableOfContents.map((item, idx) => (
                <a
                  key={idx}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    
                    // Use the same approach as search - query within content container with delay
                    setTimeout(() => {
                      // Find the content container (where headers are rendered) - it's the .prose div
                      const contentContainer = articleRef.current?.querySelector('.prose');
                      if (!contentContainer) {
                        console.warn(`[DocsUnlocked] TOC link: Content container not found for anchor "${item.id}"`);
                        return;
                      }
                      
                      // Try multiple selectors to find the element
                      let element = contentContainer.querySelector(`#${item.id}`);
                      if (!element) {
                        // Try direct getElementById as fallback
                        element = document.getElementById(item.id);
                      }
                      if (!element) {
                        // Try finding by text content as last resort (for numbered headers)
                        const headers = contentContainer.querySelectorAll('h1, h2, h3, h4');
                        for (const header of Array.from(headers)) {
                          const headerText = header.textContent?.trim();
                          // Match exact text or text without leading number/period
                          if (headerText === item.text || headerText?.replace(/^\d+\.\s*/, '') === item.text.replace(/^\d+\.\s*/, '')) {
                            element = header;
                            break;
                          }
                        }
                      }
                      
                      if (element) {
                        console.log(`[DocsUnlocked] TOC link: Found element for "${item.id}" (level ${item.level})`);
                        // Remove any existing TOC highlight
                        const existingHighlight = contentContainer.querySelector('.toc-highlight');
                        if (existingHighlight) {
                          existingHighlight.classList.remove('toc-highlight', 'bg-yellow-200', 'px-1', 'rounded', 'font-semibold');
                        }
                        
                        // Add highlight class to the header
                        element.classList.add('toc-highlight', 'bg-yellow-200', 'px-1', 'rounded', 'font-semibold');
                        
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Update URL hash with both page path and anchor (using :: as separator)
                        const hashWithAnchor = currentPath ? `${currentPath}::${item.id}` : item.id;
                        window.history.pushState(null, '', `#${hashWithAnchor}`);
                        
                        // Remove highlight after 5 seconds (same as search)
                        setTimeout(() => {
                          element.classList.remove('toc-highlight', 'bg-yellow-200', 'px-1', 'rounded', 'font-semibold');
                        }, 5000);
                      } else {
                        console.warn(`[DocsUnlocked] TOC link: Element with id "${item.id}" not found (level ${item.level}, text: "${item.text}")`);
                      }
                    }, 150);
                  }}
                  className="block text-sm text-gray-600 hover:text-gray-900 py-1 transition-colors"
                  style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
      
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        discoveredFiles={discoveredFiles}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

// Helper to safely serialize objects for console logging in Salesforce
const safeStringify = (obj: any): string => {
  try {
    if (obj === null || obj === undefined) return String(obj);
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (obj instanceof Error) {
      return `Error: ${obj.message}${obj.stack ? '\n' + obj.stack : ''}`;
    }
    return JSON.stringify(obj, (_key, value) => {
      if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack };
      }
      return value;
    }, 2);
  } catch (e) {
    return String(obj);
  }
};

// Helper for safe console logging
const safeLog = (message: string, ...args: any[]) => {
  const serialized = args.map(arg => safeStringify(arg)).join(' ');
  console.log(`[DocsUnlocked] ${message}${serialized ? ' ' + serialized : ''}`);
};

const safeError = (message: string, error?: any) => {
  const errorStr = error ? safeStringify(error) : '';
  console.error(`[DocsUnlocked] ${message}${errorStr ? ' ' + errorStr : ''}`);
};

// Auto-initialize function - accepts container element or ID string
const initDocsApp = (containerOrId: HTMLElement | string = 'docs-app-root') => {
  let container: HTMLElement | null = null;
  
  try {
    // Handle both element and ID string
    if (typeof containerOrId === 'string') {
      safeLog('Initializing Docs Unlocked, containerId:', containerOrId);
      container = document.getElementById(containerOrId);
      if (!container) {
        const msg = `Container with id "${containerOrId}" not found`;
        safeError(msg);
        throw new Error(msg);
      }
    } else {
      safeLog('Initializing Docs Unlocked, container element provided');
      container = containerOrId;
      if (!container) {
        const msg = 'Container element is null or undefined';
        safeError(msg);
        throw new Error(msg);
      }
    }
    
    // Check if React is available
    if (typeof React === 'undefined') {
      const msg = 'React is not available. Check if the bundle loaded correctly.';
      safeError(msg);
      throw new Error(msg);
    }
    
    if (typeof ReactDOM === 'undefined') {
      const msg = 'ReactDOM is not available. Check if the bundle loaded correctly.';
      safeError(msg);
      throw new Error(msg);
    }
    
    safeLog('React and ReactDOM available, creating root');
    const root = ReactDOM.createRoot(container);
    root.render(<DocsApp />);
    
    safeLog('Docs Unlocked initialized successfully');
    return root;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : safeStringify(error);
    const errorStack = error instanceof Error ? error.stack : '';
    safeError('Error initializing Docs Unlocked:', error);
    
    // Try to find container if we have an ID, otherwise use the container we already have
    let errorContainer: HTMLElement | null = container;
    if (!errorContainer && typeof containerOrId === 'string') {
      errorContainer = document.getElementById(containerOrId);
    }
    
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #c23934;">Initialization Error</h2>
          <p style="color: #333; margin-bottom: 0.5rem;"><strong>${errorMsg}</strong></p>
          ${errorStack ? `<pre style="text-align: left; background: #f4f4f4; padding: 1rem; border-radius: 4px; font-size: 0.75rem; overflow-x: auto; max-width: 100%; max-height: 300px; overflow-y: auto;">${errorStack.substring(0, 1000)}</pre>` : ''}
          <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
            Check browser console for details.
          </p>
        </div>
      `;
    }
    throw error;
  }
};

// NO AUTO-INIT - Let LWC call initDocsApp explicitly
// This avoids timing issues and makes errors easier to debug

// Also attach to window for manual initialization (backup)
// But auto-init should handle it automatically
try {
  if (typeof window !== 'undefined') {
    (window as any).initDocsApp = initDocsApp;
    if (!(window as any).DocsUnlocked) {
      (window as any).DocsUnlocked = {};
    }
    (window as any).DocsUnlocked.initDocsApp = initDocsApp;
  }
} catch (e) {
  // Ignore - auto-init will handle it
}

// Also export as a property that can be accessed
export { initDocsApp };
