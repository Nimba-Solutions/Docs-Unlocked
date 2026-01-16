# Introduction

Welcome to **Docs Unlocked**! This is a powerful documentation system built with React, TypeScript, and Tailwind CSS, designed specifically for Salesforce Lightning Web Components.

## What's Inside

Docs Unlocked provides:

- ⚡ **Fast and lightweight** - Optimized bundle size for Salesforce
- 📝 **Markdown support** - Full GitHub Flavored Markdown (GFM) support
- 🎨 **Beautiful UI** - Modern, responsive design with Tailwind CSS
- 🔒 **Salesforce-ready** - Built to run seamlessly in Salesforce orgs
- 📱 **Mobile-friendly** - Responsive design that works on all devices

## Key Features

### Markdown Rendering

Docs Unlocked uses `marked.js` with the same configuration as the popular [Markdown-Unlocked](https://github.com/Nimba-Solutions/Markdown-Unlocked) package:

- **GitHub Flavored Markdown** - Tables, task lists, strikethrough, and more
- **Automatic line breaks** - Better readability
- **Code syntax highlighting** - Powered by highlight.js
- **Safe HTML rendering** - Sanitized with DOMPurify

### Architecture

```
┌─────────────────┐
│   Salesforce    │
│      LWC        │
└────────┬────────┘
         │
         │ Loads bundle
         ▼
┌─────────────────┐
│  React Bundle   │
│  (StaticResource)│
└────────┬────────┘
         │
         │ Renders
         ▼
┌─────────────────┐
│  Documentation   │
│     Content      │
└─────────────────┘
```

## Quick Start

1. **Deploy to Salesforce**
   ```bash
   cci task run deploy --path force-app --org dev
   ```

2. **Add your content** - Upload markdown files as StaticResources

3. **Configure navigation** - Update the navigation JSON file

4. **Enjoy!** - Your documentation is ready

## Next Steps

:::navcards
title: Contributing
description: Learn how to contribute to Docs Unlocked
href: /getting-started/contributing
---
title: Basic Usage
description: Learn how to add content and use markdown features
href: /core-concepts/basic-usage
---
title: Configuration
description: Customize your documentation settings and appearance
href: /core-concepts/configuration
:::

---

> 💡 **Tip**: All markdown files should be uploaded as StaticResources in Salesforce. The naming convention converts paths like `/getting-started/introduction` to `getting_started_introduction`.
