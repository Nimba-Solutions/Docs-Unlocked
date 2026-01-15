# Configuration

## Navigation Structure

Edit `public/content/navigation.json` to update your site's navigation:

```json
[
  {
    "title": "Section Name",
    "path": "/section",
    "children": [
      {
        "title": "Page Title",
        "path": "/section/page"
      }
    ]
  }
]
```

## Styling

Customize the look and feel by editing:

1. `tailwind.config.js` - Theme configuration
2. `src/style.css` - Global styles
3. Use Tailwind classes in your markdown with HTML
