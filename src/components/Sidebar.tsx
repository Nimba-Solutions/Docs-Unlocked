import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { NavigationSection, DiscoveredFile, SearchResult } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationSection[];
  currentPath: string;
  onNavigate: (path: string, searchQuery?: string) => void;
  displayHeader: boolean;
  discoveredFiles: Map<string, DiscoveredFile>;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  navigation,
  currentPath,
  onNavigate,
  displayHeader: _displayHeader,
  discoveredFiles
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      const results: SearchResult[] = [];
      
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

  // Reset selected index when search query or results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, searchResults.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!searchQuery.trim() || searchResults.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if ((e.key === 'Enter' || e.key === ' ') && selectedIndex >= 0 && selectedIndex < searchResults.length) {
        e.preventDefault();
        const result = searchResults[selectedIndex];
        onNavigate(result.path, result.searchQuery);
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, searchResults, selectedIndex, onNavigate, onClose]);

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
        absolute lg:relative
        left-0 top-0 bottom-0 lg:top-0 lg:bottom-0
        w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:flex-shrink-0
        overflow-y-auto
        h-full
      `}>
        <div className="h-full overflow-y-auto p-6 relative">
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-0 left-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg z-50"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
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
                    {searchResults.map((result, idx) => (
                      <a
                        key={result.path}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(result.path, result.searchQuery);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`
                          block p-3 text-sm rounded-lg transition-colors cursor-pointer border
                          ${idx === selectedIndex
                            ? 'bg-blue-50 text-blue-700 border-blue-300' 
                            : currentPath === result.path
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-gray-900'
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
