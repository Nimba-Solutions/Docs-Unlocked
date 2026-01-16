# Configuration

Configure Docs Unlocked to match your needs and branding.

## Navigation Configuration

The navigation structure is defined in `public/content/navigation.json`:

```json
[
  {
    "title": "Getting Started",
    "path": "/getting-started",
    "children": [
      {
        "title": "Introduction",
        "path": "/getting-started/introduction"
      },
      {
        "title": "Contributing",
        "path": "/getting-started/contributing"
      }
    ]
  },
  {
    "title": "Core Concepts",
    "path": "/core-concepts",
    "children": [
      {
        "title": "Basic Usage",
        "path": "/core-concepts/basic-usage"
      }
    ]
  }
]
```

### Navigation Structure

Each navigation item can have:

- `title` (required) - Display name in sidebar
- `path` (required) - URL path (must match StaticResource naming)
- `children` (optional) - Array of child navigation items

## Markdown Configuration

Docs Unlocked uses `marked.js` with the following configuration (matching Markdown-Unlocked):

```typescript
marked.use({
  gfm: true,      // GitHub Flavored Markdown
  breaks: true    // Automatic line breaks
});
```

### Supported Markdown Features

✅ **Standard Markdown:**
- Headers (H1-H6)
- Bold, italic, strikethrough
- Lists (ordered, unordered)
- Links and images
- Code blocks and inline code
- Blockquotes

✅ **GitHub Flavored Markdown:**
- Tables
- Task lists (`- [ ]` and `- [x]`)
- Strikethrough (`~~text~~`)
- Autolinks
- Fenced code blocks with language tags

## Styling Configuration

### Tailwind CSS

Docs Unlocked uses Tailwind CSS for styling. Customize the theme in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Add your brand colors
      },
      typography: {
        // Customize prose styles
      }
    }
  }
}
```

### Content Styling

The `ContentRenderer` component uses Tailwind's `prose` classes for markdown content:

```typescript
className="prose prose-slate max-w-none 
  prose-headings:font-bold 
  prose-h1:text-4xl 
  prose-a:text-blue-600 
  ..."
```

### Custom CSS

Add custom styles in `src/index.css`:

```css
/* Custom markdown styles */
.prose {
  /* Your custom styles */
}

.prose code {
  /* Code block styles */
}
```

## StaticResource Configuration

### Naming Convention

Content paths are converted to StaticResource names:

| Content Path | StaticResource Name |
|--------------|---------------------|
| `/getting-started/introduction` | `getting_started_introduction` |
| `/core-concepts/basic-usage` | `core_concepts_basic_usage` |

### Upload Process

1. **Navigation JSON:**
   - File: `public/content/navigation.json`
   - StaticResource Name: `navigation_json`
   - Content Type: `application/json`

2. **Markdown Files:**
   - File: `public/content/getting-started/introduction.md`
   - StaticResource Name: `getting_started_introduction` or `getting_started_introduction_md`
   - Content Type: `text/plain` or `text/markdown`

### CDN Support (Future)

Docs Unlocked supports loading content from a CDN:

```typescript
// Set CDN base URL
window.DOCS_CDN_BASE_URL = 'https://cdn.example.com/docs';

// Content will be fetched from:
// https://cdn.example.com/docs/getting-started/introduction.md
```

## Build Configuration

### Vite Configuration

The Salesforce build is configured in `vite.config.ts`:

```typescript
build: {
  lib: {
    entry: 'src/salesforce.tsx',
    name: 'DocsUnlocked',
    formats: ['iife'],
    fileName: () => 'docs-unlocked.js'
  },
  // ... other config
}
```

### Build Scripts

- `npm run build:sf` - Build for Salesforce
  - Compiles TypeScript
  - Bundles with Vite
  - Inlines CSS
  - Copies to StaticResource location

## LWC Configuration

### Component Metadata

The LWC component metadata (`docsUnlocked.js-meta.xml`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
</LightningComponentBundle>
```

### Container Element

The LWC creates a container element:

```html
<div class="docs-container" lwc:dom="manual"></div>
```

This container is passed to React for rendering.

## Environment Variables

### Development

For local development, content is served from `public/content/`.

### Salesforce

In Salesforce, content is loaded from StaticResources:

```typescript
// Navigation
fetch('/resource/navigation_json')

// Content pages
fetch('/resource/getting_started_introduction')
```

## Customization Examples

### Change Default Path

Modify the initial path in `src/salesforce.tsx`:

```typescript
const [currentPath, setCurrentPath] = useState('/your-section/your-page');
```

### Custom Error Messages

Customize error messages in the `loadContent` function:

```typescript
setContent(`# Custom Error Message\n\nYour custom error text here.`);
```

### Add Custom Components

Extend the React app with custom components:

```typescript
// In src/salesforce.tsx
import { CustomComponent } from './components/CustomComponent';

// Use in DocsApp component
<CustomComponent />
```

## Performance Optimization

### Bundle Size

The current bundle size:
- **JavaScript**: ~217 KB (71 KB gzipped)
- **CSS**: Inlined into JS bundle

### Code Splitting

For larger documentation sites, consider:
- Lazy loading content sections
- Code splitting by route
- Dynamic imports for heavy components

## Security Considerations

### HTML Sanitization

All markdown output is sanitized with DOMPurify:

```typescript
const html = DOMPurify.sanitize(marked.parse(content));
```

This prevents XSS attacks from malicious markdown content.

### StaticResource Access

Ensure StaticResources are:
- Publicly accessible (for content)
- Properly named (to prevent conflicts)
- Version controlled (for content updates)

---

> 🎨 **Customize**: Tailor Docs Unlocked to match your brand and requirements!
