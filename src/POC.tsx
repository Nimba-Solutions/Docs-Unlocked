{`import React, { useState, useEffect } from 'react';
import { Menu, X, Search, ChevronRight, Github, Check, AlertCircle } from 'lucide-react';

// Sidebar Navigation Component
const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigation = [
    {
      title: 'Getting Started',
      items: [
        { label: 'Introduction', href: '#intro', active: true },
        { label: 'Installation', href: '#install' },
        { label: 'Quick Start', href: '#quickstart' },
        { label: 'Configuration', href: '#config' },
      ]
    },
    {
      title: 'Core Concepts',
      items: [
        { label: 'Utility-First', href: '#utility' },
        { label: 'Responsive Design', href: '#responsive' },
        { label: 'Dark Mode', href: '#dark' },
        { label: 'Customization', href: '#custom' },
      ]
    },
    {
      title: 'Components',
      items: [
        { label: 'Layout', href: '#layout' },
        { label: 'Typography', href: '#typography' },
        { label: 'Forms', href: '#forms' },
        { label: 'Buttons', href: '#buttons' },
        { label: 'Cards', href: '#cards' },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={\`
        fixed top-16 left-0 bottom-0 w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out z-40
        \${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      \`}>
        <div className="h-full overflow-y-auto p-6">
          {/* Search */}
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

          {/* Navigation */}
          <nav className="space-y-8">
            {navigation.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <a
                        href={item.href}
                        className={\`
                          block px-3 py-2 text-sm rounded-lg transition-colors
                          \${item.active 
                            ? 'bg-blue-50 text-blue-700 font-medium' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        \`}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

// Table of Contents Component
const TableOfContents = () => {
  const [activeId, setActiveId] = useState('overview');

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'Key Features' },
    { id: 'installation', label: 'Installation' },
    { id: 'basic-usage', label: 'Basic Usage' },
    { id: 'configuration', label: 'Configuration' },
    { id: 'next-steps', label: 'Next Steps' },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <aside className="hidden xl:block fixed right-0 top-16 bottom-0 w-64 border-l border-gray-200 bg-white overflow-y-auto">
      <div className="p-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          On This Page
        </h4>
        <nav className="space-y-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={\`#\${section.id}\`}
              className={\`
                block py-1 text-sm border-l-2 pl-3 transition-colors
                \${activeId === section.id
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              \`}
            >
              {section.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
};

// Code Block Component
const CodeBlock = ({ children, language = 'javascript' }: { children: React.ReactNode; language?: string }) => {
  return (
    <div className="relative group">
      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded">
          Copy
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code className="text-sm font-mono">{children}</code>
      </pre>
    </div>
  );
};

// Alert Component
const Alert = ({ type = 'info', children }: { type?: 'info' | 'success' | 'warning'; children: React.ReactNode }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  return (
    <div className={\`border-l-4 p-4 rounded-r \${styles[type]}\`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};

// Navigation Card Component
const NavCard = ({ title, description, href }: { title: string; description: string; href: string }) => {
  return (
    <a
      href={href}
      className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
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

// Main App Component
export default function TailwindDocsApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              <h1 className="text-xl font-bold">Documentation</h1>
            </div>

            <nav className="hidden md:flex items-center gap-6 ml-8">
              <a href="#" className="text-sm font-medium text-gray-900">Documentation</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Components</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Templates</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="pt-16 lg:pl-72 xl:pr-64">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Getting Started
            </h1>
            <p className="text-xl text-gray-600">
              Build modern web applications with the world's most popular CSS framework
            </p>
          </div>

          {/* Overview */}
          <section id="overview" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Overview</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to build custom designs without writing CSS. It's designed to be composable, responsive, and completely customizable to match your design system.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Unlike traditional CSS frameworks that come with pre-designed components, Tailwind gives you the building blocks to create your own unique designs while maintaining consistency and efficiency.
            </p>
          </section>

          {/* Features */}
          <section id="features" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Features</h2>
            <div className="space-y-4">
              {[
                'Utility-first approach for rapid UI development',
                'Responsive design utilities for every breakpoint',
                'Dark mode support with variant modifiers',
                'Component-friendly and highly composable',
                'Automatic CSS purging for optimal production builds',
                'Built-in support for modern CSS features'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Installation */}
          <section id="installation" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Installation</h2>
            <p className="text-gray-700 mb-4">
              Install Tailwind CSS using npm or yarn:
            </p>
            <CodeBlock>
{\`npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init\`}
            </CodeBlock>
          </section>

          {/* Basic Usage */}
          <section id="basic-usage" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Basic Usage</h2>
            <p className="text-gray-700 mb-4">
              Add Tailwind directives to your CSS file:
            </p>
            <CodeBlock language="css">
{\`@tailwind base;
@tailwind components;
@tailwind utilities;\`}
            </CodeBlock>
            
            <div className="mt-6">
              <p className="text-gray-700 mb-4">
                Start using utility classes in your HTML:
              </p>
              <CodeBlock language="html">
{\`<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Click me
</button>\`}
              </CodeBlock>
            </div>
          </section>

          {/* Configuration */}
          <section id="configuration" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Configuration</h2>
            <p className="text-gray-700 mb-4">
              Customize your Tailwind configuration in <code className="px-2 py-1 bg-gray-100 rounded text-sm">tailwind.config.js</code>:
            </p>
            <CodeBlock>
{\`module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        brand: '#3B82F6',
      },
    },
  },
  plugins: [],
}\`}
            </CodeBlock>

            <Alert type="info">
              <strong>Pro Tip:</strong> Use the <code className="px-1 bg-blue-100 rounded">extend</code> key to preserve default values while adding your custom configuration.
            </Alert>
          </section>

          {/* Next Steps */}
          <section id="next-steps" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Next Steps</h2>
            <p className="text-gray-700 mb-6">
              Ready to dive deeper? Explore these resources to master Tailwind CSS:
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <NavCard
                title="Core Concepts"
                description="Learn about utility-first CSS, responsive design, and state variants"
                href="#"
              />
              <NavCard
                title="Component Library"
                description="Browse ready-made components built with Tailwind CSS"
                href="#"
              />
              <NavCard
                title="Customization Guide"
                description="Deep dive into theme configuration and plugin development"
                href="#"
              />
              <NavCard
                title="Best Practices"
                description="Learn patterns and techniques for scaling Tailwind projects"
                href="#"
              />
            </div>
          </section>

          {/* Page Navigation */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-200">
            <div className="text-sm">
              <a href="#" className="text-gray-500 hover:text-gray-700">
                ← Previous: Welcome
              </a>
            </div>
            <div className="text-sm">
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                Next: Core Concepts →
              </a>
            </div>
          </div>
        </article>
      </main>

      {/* Table of Contents */}
      <TableOfContents />
    </div>
  );
}`}
