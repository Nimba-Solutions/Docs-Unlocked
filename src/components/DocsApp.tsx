import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X, Github } from 'lucide-react';
import yaml from 'js-yaml';
import { TOCItem, DiscoveredFile, NavigationSection } from '../types';
import { extractTitle, normalizeDisplayPath, buildNavigationFromDiscovered } from '../utils/navigation';
import { generateManifestFromTree } from '../utils/manifestGeneration';
import { Sidebar } from './Sidebar';
import { SearchModal } from './SearchModal';
import { NavigationLinks } from './NavigationLinks';
import { ContentRenderer } from './ContentRenderer';

export const DocsApp: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tocSidebarOpen, setTocSidebarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [navigation, setNavigation] = useState<NavigationSection[]>([]);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TOCItem[]>([]);
  const articleRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  
  // Get configuration from window (set by LWC)
  const displayHeader = (window as any).DOCS_DISPLAY_HEADER === true; // Default to false
  const headerLabel = (window as any).DOCS_HEADER_LABEL || 'Documentation';
  const displayFooter = (window as any).DOCS_DISPLAY_FOOTER !== false; // Default to true

  // Force container height for scrolling to work in Lightning App Pages
  useEffect(() => {
    const setContainerHeight = () => {
      if (rootRef.current) {
        const container = rootRef.current.closest('#docs-app-root') || rootRef.current.parentElement;
        if (container) {
          // Find the nearest parent with a defined height, or use viewport
          let parent = container.parentElement;
          let height = window.innerHeight;
          
          // Try to find parent with height
          while (parent && parent !== document.body) {
            const parentHeight = parent.getBoundingClientRect().height;
            if (parentHeight > 0) {
              height = parentHeight;
              break;
            }
            parent = parent.parentElement;
          }
          
          // Set height on container
          (container as HTMLElement).style.height = `${height}px`;
          (container as HTMLElement).style.minHeight = `${height}px`;
        }
      }
    };

    setContainerHeight();
    window.addEventListener('resize', setContainerHeight);
    // Also try after a short delay to catch dynamic layouts
    setTimeout(setContainerHeight, 100);
    setTimeout(setContainerHeight, 500);
    
    return () => window.removeEventListener('resize', setContainerHeight);
  }, []);

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
  const [discoveredFiles, setDiscoveredFiles] = useState<Map<string, DiscoveredFile>>(new Map());
  
  // Load navigation from manifest.json
  useEffect(() => {
    const loadNavigation = async () => {
      try {
        const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
        const manifestUrl = `/resource/${contentResourceName}/content/manifest.yaml`;
        
        let manifest: any;
        
        try {
          // Try to fetch manifest.yaml - 404 is expected when intentionally omitted
          const response = await fetch(`${manifestUrl}?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (response.ok) {
            const yamlText = await response.text();
            manifest = yaml.load(yamlText) as any;
            console.log(`[DocsUnlocked] Loaded manifest from manifest.yaml file`);
          } else {
            // 404 is expected - silently fall through to Apex generation
            throw new Error('MANIFEST_NOT_FOUND');
          }
        } catch (error: any) {
          // Suppress 404 console errors - this is expected when manifest.yaml is intentionally omitted
          if (error?.message === 'MANIFEST_NOT_FOUND' || error?.message?.includes('404')) {
            console.log(`[DocsUnlocked] manifest.yaml not provided. Generating routes from Apex...`);
          } else {
            // Only log unexpected errors
            console.log(`[DocsUnlocked] manifest.yaml not available. Generating routes from Apex...`);
          }
          
          // Fallback: generate manifest from Apex tree
          const getTreeJson = (window as any).DOCS_GET_TREE_JSON;
          if (!getTreeJson || typeof getTreeJson !== 'function') {
            console.error(`[DocsUnlocked] DOCS_GET_TREE_JSON function not available. Make sure the LWC component is properly initialized.`);
            throw new Error('DOCS_GET_TREE_JSON function not available. Make sure the LWC component is properly initialized.');
          }
          
          try {
            const treeJson = await getTreeJson(contentResourceName);
            manifest = await generateManifestFromTree(treeJson, contentResourceName);
            console.log(`[DocsUnlocked] Successfully generated routes from Apex`);
          } catch (apexError) {
            console.error(`[DocsUnlocked] Failed to generate manifest from Apex:`, apexError);
            throw apexError;
          }
        }
        console.log(`[DocsUnlocked] === SECTIONS IN STATIC RESOURCE (from manifest) ===`);
        
        const filesMap = new Map<string, DiscoveredFile>();
        const nav: NavigationSection[] = [];
        
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
        
        // Set default path if no hash is present, or validate hash path exists
        const hash = window.location.hash.replace('#', '').split('::')[0]; // Get page path, ignore anchor
        if (hash) {
          // Check if hash path exists in manifest
          const hashPath = hash.startsWith('/') ? hash : '/' + hash;
          const pathExists = filesMap.has(hashPath);
          if (pathExists) {
            console.log(`[DocsUnlocked] Hash found, setting path: ${hashPath}`);
            setCurrentPath(hashPath);
          } else {
            console.warn(`[DocsUnlocked] Hash path "${hashPath}" not found in manifest, redirecting to first page`);
            // Redirect to first page
            if (nav.length > 0 && nav[0].children.length > 0) {
              const firstPath = nav[0].children[0].path;
              window.location.hash = firstPath;
              setCurrentPath(firstPath);
            }
          }
        } else if (nav.length > 0 && nav[0].children.length > 0) {
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

  // Helper function to handle hash changes (used by both initial load and hashchange listener)
  const handleHashChange = useCallback(() => {
    if (discoveredFiles.size === 0 || navigation.length === 0) {
      return; // Wait for navigation to load
    }
    
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      // Check if hash contains :: separator (page path::anchor)
      const parts = hash.split('::');
      if (parts.length === 2) {
        const [pagePath, anchorId] = parts;
        // Normalize and set page path
        const normalizedPath = normalizeDisplayPath(pagePath);
        // Validate path exists in manifest
        if (discoveredFiles.has(normalizedPath)) {
          console.log(`[DocsUnlocked] Hash changed: ${pagePath} -> ${normalizedPath}, anchor: ${anchorId}`);
          setCurrentPath(normalizedPath);
          // Anchor scrolling will be handled after content loads
        } else {
          console.warn(`[DocsUnlocked] Hash path "${normalizedPath}" not found in manifest, redirecting to first page`);
          // Redirect to first page
          if (navigation.length > 0 && navigation[0].children.length > 0) {
            const firstPath = navigation[0].children[0].path;
            window.location.hash = firstPath;
            setCurrentPath(firstPath);
          }
        }
      } else {
        // Check if hash is a page path (starts with /) or exists in discoveredFiles
        if (hash.startsWith('/') || discoveredFiles.has(hash) || discoveredFiles.has(normalizeDisplayPath(hash))) {
          // Normalize hash path (remove numeric prefixes) to match manifest displayPath
          const normalizedHash = normalizeDisplayPath(hash);
          console.log(`[DocsUnlocked] Hash changed: ${hash} -> ${normalizedHash}`);
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
      // No hash - set to first page
      if (navigation.length > 0 && navigation[0].children.length > 0) {
        const firstPath = navigation[0].children[0].path;
        console.log(`[DocsUnlocked] No hash found, setting default path: ${firstPath}`);
        setCurrentPath(firstPath);
      }
    }
  }, [discoveredFiles, navigation]);

  // Handle initial hash
  useEffect(() => {
    handleHashChange();
  }, [handleHashChange]);

  // Listen for hashchange events (browser back/forward buttons)
  useEffect(() => {
    const handleHashChangeEvent = () => {
      handleHashChange();
    };

    window.addEventListener('hashchange', handleHashChangeEvent);
    return () => window.removeEventListener('hashchange', handleHashChangeEvent);
  }, [handleHashChange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="bg-gray-50 flex flex-col" style={{ height: '100%', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* ROW1: Mobile sidebar buttons - Only visible on mobile */}
      <div className="lg:hidden flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50"
          aria-label="Toggle navigation sidebar"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        
        {/* TOC button - only show if TOC has content */}
        {tableOfContents.length > 0 && (
          <button
            onClick={() => setTocSidebarOpen(!tocSidebarOpen)}
            className="p-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50"
            aria-label="Toggle table of contents"
          >
            {tocSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}
      </div>
      
      {/* ROW2: Header - Only visible when enabled */}
      {displayHeader && (
        <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
        </header>
      )}
      
      {/* ROW3: Left Sidebar + Content + Right Sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          navigation={navigation}
          currentPath={currentPath}
          onNavigate={handleNavigate}
          displayHeader={displayHeader}
          discoveredFiles={discoveredFiles}
        />
        <main className="flex-1 overflow-y-auto">
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
        
        {/* Right Sidebar - Table of Contents */}
        {tableOfContents.length > 0 && (
          <>
            {/* Mobile overlay */}
            {tocSidebarOpen && (
              <div 
                className="absolute inset-0 bg-black/50 z-30 lg:hidden"
                onClick={() => setTocSidebarOpen(false)}
              />
            )}
            <aside className={`
              ${tocSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
              lg:translate-x-0
              absolute lg:relative
              right-0 top-0 bottom-0 lg:top-0 lg:bottom-0
              w-80 bg-white border-l border-gray-200 z-40
              transform transition-transform duration-300 ease-in-out
              lg:flex-shrink-0
              overflow-y-auto
              h-full
            `}>
          <div className="h-full overflow-y-auto p-6 relative">
            {/* Mobile close button */}
            <button
              onClick={() => setTocSidebarOpen(false)}
              className="lg:hidden absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              aria-label="Close table of contents"
            >
              <X className="w-5 h-5" />
            </button>
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
                        const itemText = item.text.trim();
                        console.log(`[DocsUnlocked] TOC link: Searching for "${itemText}" (ID: "${item.id}")`);
                        
                        for (const header of Array.from(headers)) {
                          const headerText = header.textContent?.trim() || '';
                          const headerId = header.id || '';
                          
                          // Check if header ID matches (case-insensitive)
                          if (headerId.toLowerCase() === item.id.toLowerCase()) {
                            console.log(`[DocsUnlocked] TOC link: Found by ID match: "${headerId}"`);
                            element = header;
                            break;
                          }
                          
                          // Normalize both texts for comparison (remove leading numbers/periods, lowercase)
                          const normalizeText = (txt: string) => txt.replace(/^\d+\.\s*/, '').toLowerCase().trim();
                          const normalizedHeader = normalizeText(headerText);
                          const normalizedItem = normalizeText(itemText);
                          
                          // Match exact text or normalized text
                          if (headerText === itemText || normalizedHeader === normalizedItem) {
                            console.log(`[DocsUnlocked] TOC link: Found by text match: "${headerText}" === "${itemText}"`);
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
        </>
      )}
      </div>
      
      {/* ROW4: Footer */}
      {displayFooter && (
        <footer className="border-t border-gray-200 bg-white py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-4 md:px-6 lg:px-8">
            <div className="text-center text-sm text-gray-600">
              <p>Documentation powered by Docs Unlocked</p>
            </div>
          </div>
        </footer>
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
