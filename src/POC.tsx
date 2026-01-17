import React, { useState, useEffect } from 'react';
import { Menu, X, Search, ChevronRight, Github, Check, AlertCircle } from 'lucide-react';

// Sidebar Navigation Component
const Sidebar = ({ isOpen, onClose, activeSection }: { isOpen: boolean; onClose: () => void; activeSection: string }) => {
  const navigation = [
    {
      title: 'Getting Started',
      items: [
        { label: 'Overview', href: '#overview' },
        { label: 'Key Features', href: '#features' },
        { label: 'Installation', href: '#installation' },
        { label: 'Basic Usage', href: '#basic-usage' },
        { label: 'Configuration', href: '#configuration' },
        { label: 'Next Steps', href: '#next-steps' },
      ]
    },
    {
      title: 'Core Concepts',
      items: [
        { label: 'Utility-First', href: '#utility-first' },
        { label: 'Responsive Design', href: '#responsive-design' },
        { label: 'Dark Mode', href: '#dark-mode' },
        { label: 'Customization', href: '#customization' },
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

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      onClose(); // Close mobile sidebar after navigation
    }
  };

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
      <aside className={`
        fixed top-16 left-0 bottom-0 w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
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
                  {section.items.map((item, itemIdx) => {
                    const sectionId = item.href.replace('#', '');
                    const isActive = activeSection === sectionId;
                    return (
                      <li key={itemIdx}>
                        <a
                          href={item.href}
                          onClick={(e) => handleLinkClick(e, item.href)}
                          className={`
                            block px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer
                            ${isActive 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
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
const TableOfContents = ({ activeSection }: { activeSection: string }) => {
  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'Key Features' },
    { id: 'installation', label: 'Installation' },
    { id: 'basic-usage', label: 'Basic Usage' },
    { id: 'configuration', label: 'Configuration' },
    { id: 'next-steps', label: 'Next Steps' },
    { id: 'utility-first', label: 'Utility-First', category: 'Core Concepts' },
    { id: 'responsive-design', label: 'Responsive Design', category: 'Core Concepts' },
    { id: 'dark-mode', label: 'Dark Mode', category: 'Core Concepts' },
    { id: 'customization', label: 'Customization', category: 'Core Concepts' },
    { id: 'layout', label: 'Layout', category: 'Components' },
    { id: 'typography', label: 'Typography', category: 'Components' },
    { id: 'forms', label: 'Forms', category: 'Components' },
    { id: 'buttons', label: 'Buttons', category: 'Components' },
    { id: 'cards', label: 'Cards', category: 'Components' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const groupedSections = sections.reduce((acc, section) => {
    const category = section.category || 'Getting Started';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(section);
    return acc;
  }, {} as Record<string, typeof sections>);

  return (
    <aside className="hidden xl:block fixed right-0 top-16 bottom-0 w-64 border-l border-gray-200 bg-white overflow-y-auto">
      <div className="p-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          On This Page
        </h4>
        <nav className="space-y-6">
          {Object.entries(groupedSections).map(([category, categorySections]) => (
            <div key={category}>
              {category !== 'Getting Started' && (
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">
                  {category}
                </h5>
              )}
              <div className="space-y-2">
                {categorySections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={(e) => handleLinkClick(e, `#${section.id}`)}
                      className={`
                        block py-1 text-sm border-l-2 pl-3 transition-colors cursor-pointer
                        ${isActive
                          ? 'border-blue-500 text-blue-600 font-medium'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }
                      `}
                    >
                      {section.label}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

// Code Block Component
const CodeBlock = ({ children }: { children: React.ReactNode }) => {
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
    <div className={`border-l-4 p-4 rounded-r ${styles[type]}`}>
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
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const sections = [
      'overview', 
      'features', 
      'installation', 
      'basic-usage', 
      'configuration', 
      'next-steps',
      'utility-first',
      'responsive-design',
      'dark-mode',
      'customization',
      'layout',
      'typography',
      'forms',
      'buttons',
      'cards'
    ];
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -50% 0px' }
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeSection={activeSection} />

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
{`npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init`}
            </CodeBlock>
          </section>

          {/* Basic Usage */}
          <section id="basic-usage" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Basic Usage</h2>
            <p className="text-gray-700 mb-4">
              Add Tailwind directives to your CSS file:
            </p>
            <CodeBlock>
{`@tailwind base;
@tailwind components;
@tailwind utilities;`}
            </CodeBlock>
            
            <div className="mt-6">
              <p className="text-gray-700 mb-4">
                Start using utility classes in your HTML:
              </p>
              <CodeBlock>
{`<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Click me
</button>`}
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
{`module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        brand: '#3B82F6',
      },
    },
  },
  plugins: [],
}`}
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
                href="#utility-first"
              />
              <NavCard
                title="Component Library"
                description="Browse ready-made components built with Tailwind CSS"
                href="#layout"
              />
              <NavCard
                title="Customization Guide"
                description="Deep dive into theme configuration and plugin development"
                href="#customization"
              />
              <NavCard
                title="Best Practices"
                description="Learn patterns and techniques for scaling Tailwind projects"
                href="#"
              />
            </div>
          </section>

          {/* Core Concepts */}
          <section id="utility-first" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Utility-First Approach</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Tailwind CSS uses a utility-first approach, which means you build complex components from small, single-purpose utility classes. Instead of writing custom CSS, you compose your design directly in your markup using pre-built utility classes.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              This approach offers several advantages: faster development, easier maintenance, and better consistency across your project.
            </p>
            <CodeBlock>
{`<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h3 class="text-lg font-semibold text-gray-900">Card Title</h3>
  <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Action
  </button>
</div>`}
            </CodeBlock>
          </section>

          <section id="responsive-design" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Responsive Design</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Tailwind makes it easy to build responsive designs using breakpoint prefixes. Every utility class can be prefixed with a breakpoint name to apply styles at specific screen sizes and above.
            </p>
            <div className="mb-6">
              <p className="text-gray-700 mb-4 font-medium">Breakpoints:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><code className="px-2 py-1 bg-gray-100 rounded text-sm">sm:</code> 640px and up</li>
                <li><code className="px-2 py-1 bg-gray-100 rounded text-sm">md:</code> 768px and up</li>
                <li><code className="px-2 py-1 bg-gray-100 rounded text-sm">lg:</code> 1024px and up</li>
                <li><code className="px-2 py-1 bg-gray-100 rounded text-sm">xl:</code> 1280px and up</li>
                <li><code className="px-2 py-1 bg-gray-100 rounded text-sm">2xl:</code> 1536px and up</li>
              </ul>
            </div>
            <CodeBlock>
{`<div class="
  text-sm md:text-base lg:text-lg xl:text-xl
  p-4 md:p-6 lg:p-8
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
">
  Responsive content
</div>`}
            </CodeBlock>
          </section>

          <section id="dark-mode" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Dark Mode</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Tailwind includes built-in support for dark mode. You can enable it in your configuration and then use the <code className="px-2 py-1 bg-gray-100 rounded text-sm">dark:</code> prefix to apply styles when dark mode is active.
            </p>
            <CodeBlock>
{`// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media'
  // ...
}`}
            </CodeBlock>
            <div className="mt-6">
              <CodeBlock>
{`<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded">
  <p>This content adapts to dark mode</p>
</div>`}
              </CodeBlock>
            </div>
          </section>

          <section id="customization" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Customization</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Tailwind is highly customizable. You can extend the default theme, add custom utilities, create plugins, and configure every aspect of the framework to match your design system.
            </p>
            <CodeBlock>
{`// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}`}
            </CodeBlock>
            <div className="mt-6">
              <Alert type="info">
                <strong>Tip:</strong> Use the <code className="px-1 bg-blue-100 rounded">extend</code> key to add to the default theme without overriding existing values.
              </Alert>
            </div>
          </section>

          {/* Components */}
          <section id="layout" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Layout Components</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Tailwind provides powerful layout utilities for creating flexible, responsive layouts. Use flexbox, grid, and positioning utilities to build complex layouts quickly.
            </p>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Flexbox Layout</h3>
                <CodeBlock>
{`<div class="flex items-center justify-between gap-4">
  <div class="flex-1">Left content</div>
  <div class="flex-shrink-0">Right content</div>
</div>`}
                </CodeBlock>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Grid Layout</h3>
                <CodeBlock>
{`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div class="bg-white p-4 rounded shadow">Item 1</div>
  <div class="bg-white p-4 rounded shadow">Item 2</div>
  <div class="bg-white p-4 rounded shadow">Item 3</div>
</div>`}
                </CodeBlock>
              </div>
            </div>
          </section>

          <section id="typography" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Typography</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Tailwind includes comprehensive typography utilities for font sizes, weights, styles, and text effects. Combine them to create beautiful, readable text.
            </p>
            <CodeBlock>
{`<h1 class="text-4xl font-bold text-gray-900 mb-4">
  Heading 1
</h1>
<h2 class="text-2xl font-semibold text-gray-800 mb-3">
  Heading 2
</h2>
<p class="text-base text-gray-700 leading-relaxed mb-4">
  Body text with comfortable line height
</p>
<p class="text-sm text-gray-600 italic">
  Small italic text
</p>`}
            </CodeBlock>
            <div className="mt-6 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Example Typography</h3>
              <p className="text-lg text-gray-700 mb-4">This is a larger paragraph demonstrating typography styles.</p>
              <p className="text-base text-gray-600">Regular body text with standard sizing and spacing.</p>
            </div>
          </section>

          <section id="forms" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Form Components</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Build beautiful, accessible forms using Tailwind's form utilities. Style inputs, selects, checkboxes, and more with consistent, customizable classes.
            </p>
            <CodeBlock>
{`<form class="space-y-4">
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">
      Email Address
    </label>
    <input
      type="email"
      class="w-full px-4 py-2 border border-gray-300 rounded-lg 
             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder="you@example.com"
    />
  </div>
  
  <div>
    <label class="flex items-center">
      <input type="checkbox" class="rounded border-gray-300 text-blue-600" />
      <span class="ml-2 text-sm text-gray-700">Remember me</span>
    </label>
  </div>
  
  <button
    type="submit"
    class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg 
           hover:bg-blue-600 focus:outline-none focus:ring-2 
           focus:ring-blue-500 focus:ring-offset-2"
  >
    Submit
  </button>
</form>`}
            </CodeBlock>
          </section>

          <section id="buttons" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Button Components</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Create consistent, accessible buttons with Tailwind's utility classes. Mix and match colors, sizes, and states to build your button system.
            </p>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Button Variants</h3>
                <CodeBlock>
{`<!-- Primary Button -->
<button class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg">
  Primary
</button>

<!-- Secondary Button -->
<button class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg">
  Secondary
</button>

<!-- Outline Button -->
<button class="border-2 border-blue-500 text-blue-500 hover:bg-blue-50 font-medium py-2 px-4 rounded-lg">
  Outline
</button>

<!-- Disabled Button -->
<button disabled class="bg-gray-300 text-gray-500 cursor-not-allowed font-medium py-2 px-4 rounded-lg">
  Disabled
</button>`}
                </CodeBlock>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Button Sizes</h3>
                <CodeBlock>
{`<button class="bg-blue-500 text-white py-1 px-2 text-sm rounded">Small</button>
<button class="bg-blue-500 text-white py-2 px-4 rounded">Medium</button>
<button class="bg-blue-500 text-white py-3 px-6 text-lg rounded">Large</button>`}
                </CodeBlock>
              </div>
            </div>
          </section>

          <section id="cards" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Card Components</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Cards are versatile containers for displaying content. Use Tailwind's utilities to create cards with shadows, borders, and hover effects.
            </p>
            <CodeBlock>
{`<div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
  <img src="image.jpg" alt="Card image" class="w-full h-48 object-cover" />
  <div class="p-6">
    <h3 class="text-xl font-semibold text-gray-900 mb-2">Card Title</h3>
    <p class="text-gray-600 mb-4">
      Card description goes here. This is a simple card component.
    </p>
    <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
      Learn More
    </button>
  </div>
</div>`}
            </CodeBlock>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Example Card</h3>
                <p className="text-gray-600 text-sm">This is a live example of a card component built with Tailwind CSS.</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Another Card</h3>
                <p className="text-gray-600 text-sm">Cards can contain any content and be styled consistently.</p>
              </div>
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
      <TableOfContents activeSection={activeSection} />
    </div>
  );
}
