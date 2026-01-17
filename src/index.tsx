import React from 'react';
import ReactDOM from 'react-dom/client';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { DocsApp } from './components/DocsApp';
import { safeLog, safeError, safeStringify } from './utils/logger';
import './index.css';

// Configure marked.js with syntax highlighting
marked.use({
  gfm: true,      // GitHub Flavored Markdown
  breaks: true    // Automatic line breaks
});

// Add syntax highlighting via renderer extension
marked.use({
  renderer: {
    code(token: any) {
      const codeText = token.text || '';
      const lang = (token.lang || '').trim();
      
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(codeText, { language: lang }).value;
          return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>\n`;
        } catch (err) {
          // Fall through to auto-detect
        }
      }
      
      // Auto-detect language or use plain code
      try {
        const highlighted = hljs.highlightAuto(codeText).value;
        return `<pre><code class="hljs">${highlighted}</code></pre>\n`;
      } catch (err) {
        // Fallback to plain code if highlighting fails
        return `<pre><code>${codeText}</code></pre>\n`;
      }
    }
  }
});

// Auto-initialize function - accepts container element or ID string
export const initDocsApp = (containerOrId: HTMLElement | string = 'docs-app-root') => {
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

// Also attach to window for manual initialization (backup)
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
