/**
 * Generate manifest structure from Apex tree JSON
 */
export const generateManifestFromTree = async (
  treeJson: string,
  resourceName: string
): Promise<Record<string, Array<{ title: string; file: string; path: string }>>> => {
  const tree = JSON.parse(treeJson);
  const manifest: Record<string, Array<{ title: string; file: string; path: string }>> = {};
  
  // Helper to remove numeric prefix (e.g., "01.getting-started" -> "getting-started")
  const parseSegment = (segment: string): string => {
    const match = segment.match(/^(\d+)[.-](.+)$/);
    return match ? match[2] : segment;
  };
  
  // Helper to generate title from filename
  const generateTitleFromFilename = (filename: string): string => {
    return filename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Navigate to content section
  if (!tree.content || typeof tree.content !== 'object') {
    return manifest;
  }
  
  const content = tree.content;
  
  // Collect sections with their order information
  const sections: Array<{ folder: string; name: string; order: number; obj: Record<string, any> }> = [];
  
  for (const [sectionFolder, sectionObj] of Object.entries(content)) {
    // Skip manifest.yaml itself
    if (sectionFolder === 'manifest.yaml') {
      continue;
    }
    
    if (typeof sectionObj !== 'object' || sectionObj === null) {
      continue;
    }
    
    const section = sectionObj as Record<string, any>;
    const sectionName = parseSegment(sectionFolder);
    
    // Extract numeric prefix for sorting
    const orderMatch = sectionFolder.match(/^(\d+)[.-]/);
    const order = orderMatch ? parseInt(orderMatch[1]) : 999;
    
    sections.push({
      folder: sectionFolder,
      name: sectionName,
      order,
      obj: section
    });
  }
  
  // Sort sections by numeric prefix
  sections.sort((a, b) => a.order - b.order);
  
  // Process sections in sorted order
  for (const { name: sectionName, obj: section } of sections) {
    const files: Array<{ title: string; file: string; path: string }> = [];
    
    // Process each markdown file in the section
    for (const [fileName, filePath] of Object.entries(section)) {
      if (!fileName.endsWith('.md') || typeof filePath !== 'string') {
        continue;
      }
      
      const cleanFileName = parseSegment(fileName.replace('.md', ''));
      
      // Try to extract title from markdown content
      let title = '';
      try {
        let contentText = '';
        
        // Try Apex method first (works reliably in Experience Cloud)
        const getFileContent = (window as any).DOCS_GET_FILE_CONTENT;
        if (getFileContent && typeof getFileContent === 'function') {
          try {
            contentText = await getFileContent(resourceName, filePath);
          } catch {
            // Apex failed, will try URL fetch
          }
        }
        
        // Fallback to URL fetch if Apex didn't work
        if (!contentText) {
          const contentResourceBaseUrl = (window as any).DOCS_CONTENT_RESOURCE_BASE_URL || `/resource/${resourceName}`;
          const contentUrl = `${contentResourceBaseUrl}/${filePath}`;
          const contentResponse = await fetch(contentUrl);
          if (contentResponse.ok) {
            contentText = await contentResponse.text();
          }
        }
        
        if (contentText) {
          const h1Match = contentText.match(/^#\s+(.+)$/m);
          title = h1Match ? h1Match[1].trim() : generateTitleFromFilename(cleanFileName);
        } else {
          title = generateTitleFromFilename(cleanFileName);
        }
      } catch {
        title = generateTitleFromFilename(cleanFileName);
      }
      
      files.push({
        title,
        file: filePath.replace('content/', ''),
        path: `/${sectionName}/${cleanFileName}`
      });
    }
    
    // Sort files by numeric prefix in filename
    files.sort((a, b) => {
      const aFileName = a.file.split('/').pop() || '';
      const bFileName = b.file.split('/').pop() || '';
      const aMatch = aFileName.match(/^(\d+)[.-]/);
      const bMatch = bFileName.match(/^(\d+)[.-]/);
      return (aMatch ? parseInt(aMatch[1]) : 999) - (bMatch ? parseInt(bMatch[1]) : 999);
    });
    
    if (files.length > 0) {
      manifest[sectionName] = files;
    }
  }
  
  return manifest;
};
