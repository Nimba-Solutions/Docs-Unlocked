import { NavigationSection, NavigationItem, DiscoveredFile } from '../types';

// Helper to flatten navigation and get prev/next pages
export const flattenNavigation = (nav: NavigationSection[]): Array<{ title: string; path: string }> => {
  const result: Array<{ title: string; path: string }> = [];
  nav.forEach((section) => {
    if (section.children) {
      section.children.forEach((child: NavigationItem) => {
        result.push({ title: child.title, path: child.path });
      });
    }
  });
  return result;
};

// Extract title from markdown content
export const extractTitle = (content: string): string => {
  const h1Match = content.match(/^#\s+(.+)$/m);
  return h1Match ? h1Match[1].trim() : '';
};

// Normalize a path by removing numeric prefixes (e.g., "02.core-concepts/02.configuration" -> "/core-concepts/configuration")
export const normalizeDisplayPath = (path: string): string => {
  if (!path) return '';
  // Ensure it starts with /
  const normalized = path.startsWith('/') ? path : '/' + path;
  // Split and remove numeric prefixes from each segment
  const parts = normalized.split('/').filter(p => p).map(part => {
    const match = part.match(/^\d+[.-](.+)$/);
    return match ? match[1] : part;
  });
  return '/' + parts.join('/');
};

// Build navigation structure from discovered files
export const buildNavigationFromDiscovered = (files: Map<string, DiscoveredFile>): NavigationSection[] => {
  const sections: Record<string, { order: number; children: Array<{ title: string; path: string; displayPath: string; order: number }> }> = {};
  
  files.forEach((file) => {
    const pathParts = file.displayPath.split('/').filter(p => p);
    if (pathParts.length >= 2) {
      const sectionName = pathParts[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (!sections[sectionName]) {
        // Get order from first file in section
        const sectionOrder = file.order;
        sections[sectionName] = { order: sectionOrder, children: [] };
      }
      sections[sectionName].children.push({
        title: file.title,
        path: file.path, // Use actual path for fetching
        displayPath: file.displayPath,
        order: file.order
      });
    }
  });
  
  return Object.entries(sections)
    .map(([sectionName, sectionData]) => ({
      title: sectionName,
      path: sectionData.children[0]?.displayPath.split('/').slice(0, 2).join('/') || '',
      order: sectionData.order,
      children: sectionData.children
        .sort((a, b) => a.order - b.order)
        .map(child => ({
          title: child.title,
          path: child.displayPath // Use displayPath for navigation (without prefixes)
        }))
    }))
    .sort((a, b) => a.order - b.order);
};
