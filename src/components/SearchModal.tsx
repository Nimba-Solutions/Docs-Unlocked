import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { DiscoveredFile, SearchResult } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveredFiles: Map<string, DiscoveredFile>;
  onNavigate: (path: string, searchQuery?: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ 
  isOpen, 
  onClose, 
  discoveredFiles,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
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
      const results: SearchResult[] = [];
      
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

  // Reset selected index when search query or results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, searchResults.length]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Only handle navigation keys if we have results
      if (searchResults.length === 0 || isSearching) return;

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
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, isSearching, selectedIndex, onNavigate, onClose]);

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
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`
                      block p-4 rounded-lg transition-all cursor-pointer border-2
                      ${idx === selectedIndex
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
                      {idx === selectedIndex && (
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
