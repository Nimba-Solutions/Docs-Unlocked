# Basic Usage

Learn how to add and structure content in Docs Unlocked.

## Content Structure

Docs Unlocked uses a simple file-based content structure:

```
public/content/
├── navigation.json          # Navigation menu structure
├── getting-started/
│   ├── introduction.md
│   └── contributing.md
└── core-concepts/
    ├── basic-usage.md
    └── configuration.md
```

## Adding New Pages

### 1. Create Markdown File

Create a new `.md` file in the appropriate directory:

```markdown
# My New Page

This is the content of my new page.

## Section Header

More content here...
```

### 2. Update Navigation

Edit `public/content/navigation.json` to add your page:

```json
[
  {
    "title": "My Section",
    "path": "/my-section",
    "children": [
      {
        "title": "My New Page",
        "path": "/my-section/my-new-page"
      }
    ]
  }
]
```

### 3. Upload as StaticResource

Upload the markdown file to Salesforce as a StaticResource:

- **File**: `my-section/my-new-page.md`
- **StaticResource Name**: `my_section_my_new_page` or `my_section_my_new_page_md`

## Markdown Features

Docs Unlocked supports full GitHub Flavored Markdown. Here are some examples:

### Headers

```markdown
# H1 Header
## H2 Header
### H3 Header
#### H4 Header
```

### Text Formatting

- **Bold text** with `**bold**`
- *Italic text* with `*italic*`
- ~~Strikethrough~~ with `~~strikethrough~~`
- `Inline code` with backticks

### Lists

**Unordered Lists:**
- Item one
- Item two
  - Nested item
  - Another nested item

**Ordered Lists:**
1. First item
2. Second item
3. Third item

**Task Lists:**
- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task

### Code Blocks

**JavaScript:**
```javascript
function greet(name) {
  return `Hello, ${name}!`;
}

console.log(greet('World'));
```

**TypeScript:**
```typescript
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: 'John',
  age: 30
};
```

**Bash:**
```bash
npm run build:sf
cci task run deploy --path force-app --org dev
```

### Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown Rendering | ✅ Complete | Uses marked.js |
| GFM Support | ✅ Complete | Tables, task lists, etc. |
| Code Highlighting | ✅ Complete | Powered by highlight.js |
| Mobile Responsive | ✅ Complete | Tailwind CSS |

### Blockquotes

> This is a blockquote. Use it for important notes, warnings, or callouts.
>
> You can have multiple paragraphs in a blockquote.

### Links

- [Internal Link](./configuration.md)
- [External Link](https://github.com)
- [Link with Title](https://example.com "Example Website")

### Images

```markdown
![Alt text](image-url.png)
![Image with title](image-url.png "Image Title")
```

## Best Practices

### File Naming

- Use lowercase with hyphens: `my-page.md`
- Keep names descriptive but concise
- Match the path structure in navigation.json

### Content Organization

- Keep pages focused on a single topic
- Use clear, descriptive headers
- Break up long content with sections
- Include code examples where helpful

### StaticResource Naming

When uploading to Salesforce:

1. Convert path to StaticResource name:
   - `/getting-started/introduction` → `getting_started_introduction`
2. Replace slashes with underscores
3. Remove leading slash
4. Optionally add `_md` suffix

### Navigation Structure

Keep navigation logical and hierarchical:

```json
{
  "title": "Section Name",
  "path": "/section",
  "children": [
    {
      "title": "Page Title",
      "path": "/section/page",
      "children": [
        {
          "title": "Sub-page",
          "path": "/section/page/sub-page"
        }
      ]
    }
  ]
}
```

## Examples

### Simple Page

```markdown
# Page Title

Brief introduction paragraph.

## Section One

Content for section one.

## Section Two

Content for section two.
```

### Page with Code

```markdown
# API Reference

## Example Usage

```typescript
import { initDocsApp } from './salesforce';

initDocsApp('my-container');
```
```

### Page with Table

```markdown
# Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gfm` | boolean | `true` | Enable GitHub Flavored Markdown |
| `breaks` | boolean | `true` | Convert line breaks to `<br>` |
```

---

> 📚 **Next**: Learn about [Configuration](./configuration.md) options.
