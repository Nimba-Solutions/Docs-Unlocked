// Re-export everything from the new component-based structure for backward compatibility
export { initDocsApp } from './index';
export { DocsApp } from './components/DocsApp';
export { NavCard } from './components/NavCard';
export { ContentRenderer } from './components/ContentRenderer';
export { Sidebar } from './components/Sidebar';
export { SearchModal } from './components/SearchModal';
export { NavigationLinks } from './components/NavigationLinks';
export * from './types';
export * from './utils/markdown';
export * from './utils/navigation';
export * from './utils/logger';

// Import and configure marked.js (same as before)
import { marked } from 'marked';
import './index.css';

// Configure marked.js with same options as Markdown-Unlocked
marked.use({
  gfm: true,      // GitHub Flavored Markdown
  breaks: true    // Automatic line breaks
});
