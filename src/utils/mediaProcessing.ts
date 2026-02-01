/**
 * Process images: convert relative paths to StaticResource URLs
 */
export const processImages = (html: string): string => {
  const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
  // Use the base URL from LWC if available (handles Experience Cloud), otherwise fallback to /resource/
  const contentResourceBaseUrl = (window as any).DOCS_CONTENT_RESOURCE_BASE_URL || `/resource/${contentResourceName}`;
  
  return html.replace(/<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    // Skip if already absolute URL (http/https) or data URI
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return match;
    }
    
    // Normalize path - remove leading ./ or ../
    let normalizedPath = src.replace(/^\.\//, '').replace(/^\.\.\//, '');
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
    
    // Check if path starts with /media/ - if so, use media folder, otherwise use content folder
    let staticResourceUrl: string;
    if (normalizedPath.startsWith('/media/')) {
      // Strip /media/ prefix since we're already in the media folder
      const mediaPath = normalizedPath.replace(/^\/media\//, '');
      staticResourceUrl = `${contentResourceBaseUrl}/media/${mediaPath}`;
    } else {
      staticResourceUrl = `${contentResourceBaseUrl}/content${normalizedPath}`;
    }
    return `<img${before} src="${staticResourceUrl}"${after}>`;
  });
};

/**
 * Process videos: detect video file extensions and convert to <video> tags
 * Supports YouTube, Vimeo, and direct video files
 */
export const processVideos = (html: string): string => {
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i;
  const contentResourceName = (window as any).DOCS_CONTENT_RESOURCE_NAME || 'docsContent';
  // Use the base URL from LWC if available (handles Experience Cloud), otherwise fallback to /resource/
  const contentResourceBaseUrl = (window as any).DOCS_CONTENT_RESOURCE_BASE_URL || `/resource/${contentResourceName}`;
  
  // Convert image tags with video extensions to video tags
  // Note: Videos must be hosted externally (Salesforce Files or public URLs) due to 5MB StaticResource limit
  let processed = html.replace(/<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    // Extract alt text from the img tag
    const altMatch = before.match(/alt=["']([^"']*)["']/i) || after.match(/alt=["']([^"']*)["']/i);
    const altText = altMatch ? altMatch[1] : '';
    
    // Check for YouTube URLs
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = src.match(youtubeRegex);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return `<div class="my-4"><iframe class="w-full rounded-lg" style="aspect-ratio: 16/9; height: auto;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen${altText ? ` title="${altText}"` : ''}></iframe></div>`;
    }
    
    // Check for Vimeo URLs
    const vimeoRegex = /vimeo\.com\/(\d+)/;
    const vimeoMatch = src.match(vimeoRegex);
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return `<div class="my-4"><iframe class="w-full rounded-lg" style="aspect-ratio: 16/9; height: auto;" src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen${altText ? ` title="${altText}"` : ''}></iframe></div>`;
    }
    
    // Check if it's a video file extension
    if (!videoExtensions.test(src)) {
      return match; // Not a video, return as-is
    }
    
    // If already absolute URL (http/https), use it directly
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const extension = src.split('.').pop()?.toLowerCase() || 'mp4';
      const mimeTypes: Record<string, string> = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'mkv': 'video/x-matroska'
      };
      const mimeType = mimeTypes[extension] || 'video/mp4';
      return `<video controls class="w-full rounded-lg my-4"${altText ? ` aria-label="${altText}"` : ''}><source src="${src}" type="${mimeType}">Your browser does not support the video tag.</video>`;
    }
    
    // For relative paths, show a warning message instead of trying to load from StaticResource
    // (StaticResources have a 5MB limit, so videos should be hosted externally)
    return `<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4"><p class="text-sm text-yellow-800"><strong>Video not supported in StaticResources:</strong> Videos must be hosted externally (Salesforce Files or public URLs) due to Salesforce's 5MB StaticResource size limit. Use an absolute URL like <code>https://your-domain.com/video.mp4</code> or a Salesforce Files URL.</p></div>`;
  });
  
  // Also support explicit video syntax: ![video](path.mp4) or <video src="path.mp4"></video>
  processed = processed.replace(/<video([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    // Skip if already absolute URL
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return match;
    }
    
    // Normalize path
    let normalizedPath = src.replace(/^\.\//, '').replace(/^\.\.\//, '');
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
    
    // Check if path starts with /media/ - if so, use media folder, otherwise use content folder
    let staticResourceUrl: string;
    if (normalizedPath.startsWith('/media/')) {
      // Strip /media/ prefix since we're already in the media folder
      const mediaPath = normalizedPath.replace(/^\/media\//, '');
      staticResourceUrl = `${contentResourceBaseUrl}/media/${mediaPath}`;
    } else {
      staticResourceUrl = `${contentResourceBaseUrl}/content${normalizedPath}`;
    }
    return `<video${before} src="${staticResourceUrl}"${after}>`;
  });
  
  return processed;
};
