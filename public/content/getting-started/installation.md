# Installation

This guide will walk you through installing and deploying Docs Unlocked to your Salesforce org.

## Prerequisites

Before you begin, ensure you have:

- ✅ A Salesforce org (Developer, Sandbox, or Production)
- ✅ [CumulusCI](https://cumulusci.readthedocs.io/) installed and configured
- ✅ Node.js 18+ and npm installed locally
- ✅ Git (for cloning the repository)

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/docs-unlocked.git
cd docs-unlocked
```

## Step 2: Install Dependencies

Install the required npm packages:

```bash
npm install
```

This will install:
- React and React DOM
- TypeScript and build tools
- Tailwind CSS
- marked.js (for markdown rendering)
- DOMPurify (for HTML sanitization)

## Step 3: Build the Salesforce Bundle

Build the optimized bundle for Salesforce:

```bash
npm run build:sf
```

This command:
1. Compiles TypeScript
2. Bundles React app with Vite
3. Inlines CSS into the JavaScript bundle
4. Copies the bundle to `force-app/main/default/staticresources/docsUnlocked.js`

## Step 4: Configure CumulusCI

Ensure your `cumulusci.yml` is configured correctly. The default configuration includes:

```yaml
dependencies:
  - github: https://github.com/Nimba-Solutions/Markdown-Unlocked
```

> **Note**: While Docs Unlocked uses `marked.js` directly (not the Markdown-Unlocked LWC), you may still want this dependency if you plan to use other components from that package.

## Step 5: Deploy to Salesforce

Deploy the Lightning Web Component and StaticResource:

```bash
cci task run deploy --path force-app --org dev
```

Or use the dev org flow:

```bash
cci flow run dev_org --org dev
```

## Step 6: Add Content StaticResources

Upload your markdown content files as StaticResources:

1. **Navigation JSON**: Upload `public/content/navigation.json` as `navigation_json`
2. **Markdown Files**: Upload each `.md` file with the naming convention:
   - Path: `/getting-started/introduction`
   - StaticResource name: `getting_started_introduction` or `getting_started_introduction_md`

### Example StaticResource Names

| Content Path | StaticResource Name |
|--------------|---------------------|
| `/getting-started/introduction` | `getting_started_introduction` |
| `/getting-started/installation` | `getting_started_installation` |
| `/core-concepts/basic-usage` | `core_concepts_basic_usage` |

## Step 7: Add Component to a Page

1. Go to **Setup** → **Lightning App Builder**
2. Create or edit a Lightning Page
3. Add the `docsUnlocked` component to your page
4. Save and activate the page

## Verification

After deployment, verify:

- [ ] The LWC component loads without errors
- [ ] Navigation sidebar appears
- [ ] Content pages load correctly
- [ ] Markdown renders properly (headers, lists, code blocks)
- [ ] Mobile responsive design works

## Troubleshooting

### Bundle Not Loading

If the React bundle doesn't load:

1. Check that `docsUnlocked.js` StaticResource exists
2. Verify the StaticResource is public
3. Check browser console for errors
4. Ensure the LWC has proper permissions

### Content Not Found

If content pages show "Content not found":

1. Verify StaticResource names match the path convention
2. Check that StaticResources are uploaded and public
3. Review the browser console for fetch errors

### Markdown Not Rendering

If markdown appears as plain text:

1. Verify `marked.js` is bundled correctly
2. Check browser console for JavaScript errors
3. Ensure DOMPurify is not blocking content

## Next Steps

- Read [Basic Usage](../core-concepts/basic-usage.md) to learn how to add content
- Check [Configuration](../core-concepts/configuration.md) for customization options

---

> 🚀 **Ready to go?** Start adding your documentation content!
