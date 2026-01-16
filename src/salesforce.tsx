import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Menu, X, Search, Github, ChevronRight, ChevronLeft } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './index.css';

// Configure marked.js with same options as Markdown-Unlocked
marked.use({
  gfm: true,      // GitHub Flavored Markdown
  breaks: true    // Automatic line breaks
});

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
const ContentRenderer = ({ content }: { content: string }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse markdown to HTML and sanitize it
  const html = useMemo(() => {
    if (!content) return '';
    try {
      // marked.parse() returns a string (synchronous) in the version we're using
      const rawHtml = marked.parse(content) as string;
      // Wrap code blocks with copy button before sanitizing
      const wrappedHtml = wrapCodeBlocks(rawHtml);
      return DOMPurify.sanitize(wrappedHtml);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[DocsUnlocked] Error rendering markdown: ${errorMsg}`);
      return `<p>Error rendering markdown: ${DOMPurify.sanitize(errorMsg)}</p>`;
    }
  }, [content]);

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
  onNavigate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  navigation: any[];
  currentPath: string;
  onNavigate: (path: string) => void;
}) => {
  const renderNavItems = (items: any[], level = 0) => {
    return items.map((item) => {
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed left-0 w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:absolute lg:left-0 lg:top-16 lg:bottom-0 lg:w-72 lg:transform-none lg:translate-x-0
      `} style={{ 
        overflowY: 'auto'
      }}>
        <div className="h-full overflow-y-auto p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <nav className="space-y-8">
            {navigation.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.children && renderNavItems(section.children)}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>
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
  onNavigate 
}: { 
  navigation: any[]; 
  currentPath: string; 
  onNavigate: (path: string) => void;
}) => {
  const flatNav = useMemo(() => flattenNavigation(navigation), [navigation]);
  const currentIndex = flatNav.findIndex(item => item.path === currentPath);
  const prevPage = currentIndex > 0 ? flatNav[currentIndex - 1] : null;
  const nextPage = currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null;

  if (!prevPage && !nextPage) return null;

  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200">
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
  const [navigation, setNavigation] = useState<any[]>([]);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/getting-started/introduction');
  const [contentLoading, setContentLoading] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  // Load navigation
  useEffect(() => {
    const loadNavigation = async () => {
      try {
        // Load navigation from ZIP StaticResource
        // ZIP StaticResources can be accessed via /resource/ResourceName/path/to/file
        const response = await fetch('/resource/docsContent/content/navigation.json');
        if (!response.ok) {
          // Fallback: try old single-file StaticResource
          const fallbackResponse = await fetch('/resource/navigation_json');
          if (!fallbackResponse.ok) {
            throw new Error('StaticResource not found');
          }
          const fallbackData = await fallbackResponse.json();
          setNavigation(fallbackData);
          return;
        }
        const data = await response.json();
        setNavigation(data);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[DocsUnlocked] Failed to load navigation: ${errorMsg}`);
        // Default navigation structure
        setNavigation([
          {
            title: 'Getting Started',
            children: [
              { title: 'Introduction', path: '/getting-started/introduction' },
              { title: 'Installation', path: '/getting-started/installation' },
            ]
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadNavigation();
  }, []);

  // Load markdown content
  useEffect(() => {
    const loadContent = async () => {
      if (!currentPath) return;
      
      setContentLoading(true);
      try {
        // Load from ZIP StaticResource
        // Path format: /resource/docsContent/content/getting-started/introduction.md
        const contentPath = `${currentPath}.md`;
        let response = await fetch(`/resource/docsContent/content${contentPath}`);
        
        if (!response.ok) {
          // Fallback: try old single-file StaticResource naming convention
          const resourceName = currentPath.replace(/^\//, '').replace(/\//g, '_');
          response = await fetch(`/resource/${resourceName}`);
          
          if (!response.ok) {
            // Try with _md suffix
            response = await fetch(`/resource/${resourceName}_md`);
          }
        }
        
        if (!response.ok) {
          // Fallback: try CDN (for future use)
          const cdnBase = (window as any).DOCS_CDN_BASE_URL;
          if (cdnBase) {
            const cdnUrl = `${cdnBase}${currentPath}.md`;
            response = await fetch(cdnUrl);
          }
        }
        
        if (!response.ok) {
          throw new Error('Content not found');
        }
        
        const text = await response.text();
        setContent(text);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[DocsUnlocked] Failed to load content for path "${currentPath}": ${errorMsg}`);
        setContent(`# Content Not Found\n\nUnable to load content for path: \`${currentPath}\`\n\n**Expected location:**\n- ZIP StaticResource: \`/resource/docsContent/content${currentPath}.md\`\n- Or single StaticResource: \`/resource/${currentPath.replace(/^\//, '').replace(/\//g, '_')}\`\n\nPlease ensure the \`docsContent\` ZIP StaticResource is deployed with all content files.`);
      } finally {
        setContentLoading(false);
      }
    };
    
    loadContent();
  }, [currentPath]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    // Update URL hash for bookmarking
    window.location.hash = path;
  };

  // Scroll to top when path changes
  useEffect(() => {
    // Wait for content to load before scrolling
    if (contentLoading) return;
    
    // Find the scrollable container (could be window or a parent element)
    const scrollContainer = articleRef.current?.closest('[data-scroll-container]') || 
                           articleRef.current?.parentElement?.parentElement || 
                           window;
    
    if (articleRef.current) {
      // Try to scroll the article into view
      articleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Also scroll window to top as fallback (for Salesforce's nested structure)
      if (scrollContainer === window) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (scrollContainer instanceof HTMLElement) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentPath, contentLoading]);

  // Handle initial hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setCurrentPath(hash);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 relative">
      <header className="sticky top-0 h-16 bg-white border-b border-gray-200 z-50">
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
              <span className="text-xl font-bold text-gray-900">Documentation</span>
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
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        navigation={navigation}
        currentPath={currentPath}
        onNavigate={handleNavigate}
      />
      <main className="lg:pl-72">
        <article ref={articleRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {contentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading content...</div>
            </div>
          ) : (
            <>
              <ContentRenderer content={content} />
              <NavigationLinks 
                navigation={navigation}
                currentPath={currentPath}
                onNavigate={handleNavigate}
              />
            </>
          )}
        </article>
      </main>
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
