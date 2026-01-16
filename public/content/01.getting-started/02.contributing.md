# Contributing

Thank you for your interest in contributing to Docs Unlocked! This guide will help you get started with contributing to the project.

## Getting Started

To contribute to Docs Unlocked:

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/docs-unlocked.git
   cd docs-unlocked
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- A Salesforce org for testing (optional but recommended)

### Building Locally

Build the project for local development:

```bash
npm run build:sf
```

This will:
- Compile TypeScript
- Bundle the React app
- Inline CSS into the JavaScript bundle
- Copy files to the Salesforce StaticResource location

### Testing Your Changes

1. **Deploy to a dev org**:
   ```bash
   cci task run deploy --path force-app --org dev
   ```

2. **Test your changes** in the Salesforce org

3. **Make updates** and rebuild as needed

## How to Contribute

### Reporting Issues

Found a bug or have a feature request? Please open an issue on GitHub with:
- A clear description of the issue
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Browser/OS information if relevant

### Submitting Pull Requests

1. **Make your changes** in a feature branch
2. **Test thoroughly** - ensure your changes work in Salesforce
3. **Update documentation** if needed
4. **Commit with clear messages**:
   ```bash
   git commit -m "Add feature: description of what you added"
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** on GitHub

### Code Style

- Follow existing code patterns
- Use TypeScript for type safety
- Keep components focused and reusable
- Add comments for complex logic
- Ensure accessibility (keyboard navigation, ARIA labels, etc.)

## Project Structure

```
docs-unlocked/
├── src/                    # React/TypeScript source code
│   └── salesforce.tsx     # Main Salesforce component
├── force-app/             # Salesforce metadata
│   └── main/default/
│       ├── lwc/           # Lightning Web Component
│       └── staticresources/  # Static resources
├── public/content/        # Sample markdown content
└── scripts/               # Build scripts
```

## Areas for Contribution

We welcome contributions in these areas:

- **New Features**: Add functionality that improves the documentation experience
- **Bug Fixes**: Fix issues and improve stability
- **Documentation**: Improve docs, add examples, fix typos
- **Performance**: Optimize bundle size, improve load times
- **Accessibility**: Improve keyboard navigation, screen reader support
- **UI/UX**: Enhance the design and user experience

## Questions?

- Open an issue for questions or discussions
- Check existing issues and PRs for similar topics
- Review the [Basic Usage](../core-concepts/basic-usage.md) guide

---

> 💡 **Tip**: Start small! Even fixing typos or improving documentation is valuable. Every contribution helps!
