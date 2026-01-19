# Docs-Unlocked

## Introduction

Welcome to **Docs Unlocked**! A powerful, lightweight documentation system built specifically for Salesforce.

Docs Unlocked provides a beautiful, searchable documentation experience with minimal setup. Write your docs in Markdown, organize them in folders, and Docs Unlocked handles the rest.

<img width="542" height="350" alt="image" src="https://github.com/user-attachments/assets/365ff5a4-8ab7-45c6-a881-33ec9a423af9" />

## Key Features

### Basic
- 📝 **Markdown Support** - Write documentation using simple markdown syntax
- 🔍 **Full-Content Search** - Search across all documentation pages instantly (Ctrl+K / Cmd+K)
- 🎯 **Anchor Links** - Deep linking to specific sections within pages
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile
- ⚡ **Fast & Lightweight** - Optimized for Salesforce performance

### Advanced
- 🤖 **[File Based Routing](/public/content/01.getting-started/02.basic-usage.md#directory-structure)** - Automatically generates navigation from your file structure
- 🔐 **[Conditional Visibility](/public/content/03.advanced-topics/01.conditional-visibility.md)** - Show or hide content based on Salesforce permissions
- 🔀 **[Screen Flow Support](/public/content/03.advanced-topics/02.embedded-flows.md)** - Embed Screen Flows directly in your documentation
- 🎨 **[Rich Content Support](/public/content/01.getting-started/02.basic-usage.md#media)** - Embed images, videos, and probably other stuff


## How It Works

Docs Unlocked consists of two main components:

1. **Lightning Web Component** - The Salesforce component that displays your documentation
2. **Content Files** - Your markdown files organized in folders, stored in a ZIP StaticResource ([learn more](/public/content/01.getting-started/02.basic-usage.md#automatic-vs-manual-navigation)).

## Quick Start

### 1. Organize Your Content

Create markdown files organized in folders:

```plaintext
content/
├── 01.getting-started/
│   ├── 01.introduction.md
│   └── 02.basic-usage.md
└── 02.core-concepts/
    └── 01.configuration.md
```

For more details on file organization, see the [directory structure guide](/public/content/01.getting-started/02.basic-usage.md#directory-structure).

### 2. Create ZIP File

Package your `content/` folder (and optional `media/` folder) into a ZIP file. See [packaging instructions](/public/content/01.getting-started/02.basic-usage.md#packaging-your-content) for details.

> [!IMPORTANT]
> StaticResources have a maximum file size of 5mb, so while you technically can include media directly, we *strongly* recommend you serve rich content from remote sources. see [Basic Usage > Media](/public/content/01.getting-started/02.basic-usage.md#Media) for more information.

### 3. Upload to Salesforce

1. Go to **Setup** → **Custom Code** → **Static Resources**
2. Click **New**
3. **Name**: `docsContent` (or your preferred name)
4. **File**: Upload your ZIP file
5. **Cache Control**: **Public**
6. Click **Save**

### 4. Add to Lightning Page

1. Open Lightning App Builder
2. Add the "Docs Unlocked" component to your page
3. Set **Content Resource Name** to match your StaticResource name
4. Configure your header, footer, etc
5. Save and activate

That's it! Your documentation is now live.

> [!TIP]
> Docs Unlocked automatically generates navigation from your file structure. Page titles are extracted from the first H1 header in each markdown file, and a full table of contents is generated from your H1-H4 headers for each page. Sections and pages will be sorted alphabetically by default, but this can be controlled granularly through numeric prefixes or by including a `manifest.yml` file with your content. For more details, see [Basic Usage](/public/content/01.getting-started/02.basic-usage.md).

## Navigation

- **Sidebar** - Shows all sections and pages
- **Search** - Press `Ctrl+K` (or `Cmd+K` on Mac) to search all content
- **Previous/Next** - Navigate between pages at the top of content
- **Deep Links** - Share links to specific pages or sections
- **Anchor Links** - Jump to specific sections within pages using `#page-path::anchor-id`
