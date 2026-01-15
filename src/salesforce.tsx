import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Menu, X, Search, Github } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';
import './index.css';

// Markdown Renderer Component
const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-4xl prose-h1:sm:text-5xl prose-h1:mb-4 prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-gray-800 prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-li:text-gray-700 prose-li:mb-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="relative group my-4">
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                    onClick={() => {
                      navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                    }}
                  >
                    Copy
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed top-16 left-0 bottom-0 w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
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

// Main App Component
const DocsApp = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigation, setNavigation] = useState<any[]>([]);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/getting-started/introduction');
  const [contentLoading, setContentLoading] = useState(false);

  // Load navigation
  useEffect(() => {
    const loadNavigation = async () => {
      try {
        // Try to load from StaticResource first, fallback to CDN
        const response = await fetch('/resource/navigation_json');
        if (!response.ok) {
          // Fallback: try CDN or use default
          throw new Error('StaticResource not found');
        }
        const data = await response.json();
        setNavigation(data);
      } catch (error) {
        console.error('Failed to load navigation:', error);
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
        // Convert path to StaticResource name (e.g., /getting-started/introduction -> getting_started_introduction)
        // Remove leading slash and replace slashes with underscores
        const resourceName = currentPath.replace(/^\//, '').replace(/\//g, '_');
        
        // Try StaticResource first (Salesforce format: /resource/StaticResourceName)
        let response = await fetch(`/resource/${resourceName}`);
        
        if (!response.ok) {
          // Fallback: try with _md suffix
          response = await fetch(`/resource/${resourceName}_md`);
        }
        
        if (!response.ok) {
          // Fallback: try CDN (for future use)
          // CDN base URL can be configured via window.DOCS_CDN_BASE_URL
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
        console.error('Failed to load content:', error);
        setContent(`# Content Not Found\n\nUnable to load content for path: \`${currentPath}\`\n\n**StaticResource naming:**\n- Path: \`${currentPath}\`\n- Expected StaticResource name: \`${currentPath.replace(/^\//, '').replace(/\//g, '_')}\` or \`${currentPath.replace(/^\//, '').replace(/\//g, '_')}_md\`\n\nPlease ensure the StaticResource is uploaded with the correct name.`);
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
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
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
      <main className="pt-16 lg:pl-72">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {contentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading content...</div>
            </div>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </article>
      </main>
    </div>
  );
};

// Export initialization function for LWC
(window as any).initDocsApp = (containerId: string = 'docs-app-root') => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }
  
  const root = ReactDOM.createRoot(container);
  root.render(<DocsApp />);
  
  return root;
};

// Auto-initialize if container exists
if (document.getElementById('docs-app-root')) {
  (window as any).initDocsApp('docs-app-root');
}
