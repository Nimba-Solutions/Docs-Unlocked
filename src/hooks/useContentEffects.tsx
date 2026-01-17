import { useEffect, RefObject } from 'react';
import ReactDOM from 'react-dom/client';
import { NavCard } from '../components/NavCard';

/**
 * Hook to handle copy button functionality for code blocks
 */
export const useCopyButtons = (contentRef: RefObject<HTMLDivElement>, html: string) => {
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
  }, [contentRef, html]);
};

/**
 * Hook to replace NavCard placeholders with React components
 */
export const useNavCardRendering = (
  contentRef: RefObject<HTMLDivElement>,
  html: string,
  onNavigate?: (path: string) => void
) => {
  useEffect(() => {
    if (!contentRef.current) return;

    const cleanupFunctions: Array<() => void> = [];

    // Use a small delay to ensure DOM is fully updated after dangerouslySetInnerHTML
    const timeoutId = setTimeout(() => {
      if (!contentRef.current) return;

      const placeholders = contentRef.current.querySelectorAll('.navcard-placeholder');
      console.log(`[DocsUnlocked] Found ${placeholders.length} navcard placeholders in DOM`);
      
      if (placeholders.length === 0) return;

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
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [html, onNavigate]); // Removed contentRef and navCards from deps - only react to html changes
};

/**
 * Hook to handle Salesforce Lightning links
 */
export const useLightningLinks = (contentRef: RefObject<HTMLDivElement>, html: string) => {
  useEffect(() => {
    if (!contentRef.current) return;

    const links = contentRef.current.querySelectorAll('a[href]');
    const cleanupFunctions: Array<() => void> = [];

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;

      // Check if it's a Lightning link (starts with "lightning/")
      if (href.startsWith('lightning/')) {
        const handleClick = (e: Event) => {
          e.preventDefault();
          // Convert to full Lightning URL
          const lightningUrl = href.startsWith('/') ? href : `/${href}`;
          // Use Salesforce's navigation API if available, otherwise use window.location
          if ((window as any).sforce?.one?.navigateToURL) {
            (window as any).sforce.one.navigateToURL(lightningUrl);
          } else {
            window.location.href = lightningUrl;
          }
        };
        link.addEventListener('click', handleClick);
        cleanupFunctions.push(() => {
          link.removeEventListener('click', handleClick);
        });
      }
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [contentRef, html]);
};

/**
 * Hook to highlight search query and scroll to first match
 */
export const useSearchHighlight = (
  contentRef: RefObject<HTMLDivElement>,
  html: string,
  highlightQuery?: string
) => {
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

    // Scroll to highlight after ensuring DOM is updated and content is rendered
    const scrollTimeout = setTimeout(() => {
      const highlightEl = container.querySelector('#search-highlight') as HTMLElement;
      if (!highlightEl) return;
      
      // Find the scrollable container (main element)
      const scrollContainer = container.closest('main') as HTMLElement;
      
      // Use requestAnimationFrame to ensure DOM is fully painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Double-check element still exists
          if (!container.querySelector('#search-highlight')) return;
          
          if (scrollContainer && scrollContainer !== document.body) {
            // For scrollable container elements, calculate relative position
            const elementRect = highlightEl.getBoundingClientRect();
            
            // Calculate the element's position relative to the container's scroll position
            const elementTop = highlightEl.offsetTop;
            const containerHeight = scrollContainer.clientHeight;
            
            // Calculate target scroll position to center the element
            const targetScrollTop = elementTop - (containerHeight / 2) + (elementRect.height / 2);
            
            scrollContainer.scrollTo({ 
              top: Math.max(0, targetScrollTop), 
              behavior: 'smooth' 
            });
          } else {
            // Fallback to standard scrollIntoView for window scrolling
            highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
    }, 400);

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
  }, [contentRef, html, highlightQuery]);
};
