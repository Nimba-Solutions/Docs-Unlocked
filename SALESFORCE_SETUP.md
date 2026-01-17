# Salesforce Setup Guide

This guide explains how to deploy and use the Docs Unlocked component in Salesforce.

## Building the Bundle

1. Build the Salesforce bundle:
```bash
npm run build:sf
```

This creates `dist-sf/docs-unlocked.js` which contains the entire React app bundled into a single file.

## Deploying to Salesforce

### 1. Create StaticResource

1. In Salesforce Setup, go to **Custom Code > Static Resources**
2. Click **New**
3. Name: `docsUnlocked`
4. Upload the file: `dist-sf/docs-unlocked.js`
5. Cache Control: **Public**
6. Click **Save**

### 2. Create Navigation StaticResource (Optional)

1. Create a JSON file with your navigation structure:
```json
[
  {
    "title": "Getting Started",
    "children": [
      {
        "title": "Introduction",
        "path": "/getting-started/introduction"
      },
      {
        "title": "Installation",
        "path": "/getting-started/installation"
      }
    ]
  }
]
```

2. Upload as StaticResource named `navigation_json`

### 3. Create Markdown StaticResources

For each markdown file you want to display:

1. Name convention: Convert path to StaticResource name
   - Path: `/getting-started/introduction`
   - StaticResource name: `getting_started_introduction` or `getting_started_introduction_md`

2. Upload each `.md` file as a StaticResource with the corresponding name

### 4. Deploy LWC Component

Deploy the LWC component using Salesforce CLI:

```bash
sfdx force:source:deploy -p force-app/main/default/lwc/docsUnlocked
```

Or use VS Code with Salesforce Extensions.

## Using the Component

1. Add the component to a Lightning App Page, Record Page, or Home Page
2. The component will automatically:
   - Load the React bundle from StaticResource
   - Load navigation from `navigation_json` StaticResource
   - Load markdown content from StaticResources based on the current path

## URL Navigation

The component uses hash-based routing:
- `#/getting-started/introduction` loads the corresponding StaticResource
- Navigation updates the hash automatically

## Future: CDN Support

To enable CDN support (fetching markdown from external URLs), modify `src/salesforce.tsx` to:
1. Try StaticResource first
2. Fallback to CDN URL if StaticResource fails
3. Use a configurable CDN base URL

Example CDN fallback:
```typescript
// In loadContent function
if (!response.ok) {
  // Try CDN
  const cdnUrl = `https://your-cdn.com${currentPath}.md`;
  response = await fetch(cdnUrl);
}
```

## Troubleshooting

- **Component not loading**: Check browser console for errors. Ensure StaticResource is Public.
- **Content not found**: Verify StaticResource names match the path convention.
- **Styling issues**: Ensure Tailwind CSS is included in the bundle (it should be automatically).
