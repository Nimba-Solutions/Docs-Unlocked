import { TOCItem } from '../types';

/**
 * Extract TOC from HTML and add IDs to headers
 */
export const extractTOCAndAddIds = (html: string, onTOCChange?: (toc: TOCItem[]) => void): string => {
  const toc: TOCItem[] = [];
  
  // Use a more robust regex that handles headers with nested HTML
  const htmlWithIds = html.replace(/<h([1-4])([^>]*)>([\s\S]*?)<\/h[1-4]>/gi, (_match, level, attrs, content) => {
    // Extract text content from HTML (remove HTML tags using regex)
    let text = content.replace(/<[^>]*>/g, '').trim();
    
    // Decode HTML entities (like &#39; -> ')
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    text = tempDiv.textContent || tempDiv.innerText || text;
    
    if (!text) return _match; // Skip empty headers
    
    // Generate ID from text (lowercase, replace spaces with hyphens, remove special chars)
    const id = text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    if (id) {
      toc.push({
        id,
        text: text,
        level: parseInt(level)
      });
      
      // Check if ID already exists in attrs
      const hasId = attrs.includes('id=');
      if (hasId) {
        // Replace existing ID
        return `<h${level}${attrs.replace(/id=["'][^"']*["']/i, `id="${id}"`)}>${content}</h${level}>`;
      } else {
        return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
      }
    }
    
    return _match; // Return unchanged if no valid ID
  });
  
  // Notify parent of TOC changes
  if (onTOCChange) {
    onTOCChange(toc);
  }
  
  return htmlWithIds;
};
