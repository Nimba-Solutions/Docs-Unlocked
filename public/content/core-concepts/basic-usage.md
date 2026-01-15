# Basic Usage

## Adding Content

1. Create markdown files in the `public/content` directory
2. Update `navigation.json` to include your new pages
3. That's it!

## File Structure

```
public/content/
  ├── navigation.json
  └── your-section/
      └── your-page.md
```

## Writing Content

Use standard Markdown syntax:

```markdown
# Page Title

## Section

Content goes here...

- List items
- More items

### Code Examples

\`\`\`typescript
function example() {
  console.log("Hello!");
}
\`\`\`
```
