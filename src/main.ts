import { marked } from 'marked';

// Types
interface NavSection {
    title: string;
    items: NavItem[];
}

interface NavItem {
    label: string;
    href: string;
    active?: boolean;
}

// DOM Elements
const sidebar = document.getElementById('sidebar')!;
const sidebarToggle = document.getElementById('sidebar-toggle')!;
const navContent = document.getElementById('nav-content')!;
const mainContent = document.getElementById('content')!;

// Navigation Data
const navigation: NavSection[] = [
    {
        title: 'Getting Started',
        items: [
            { label: 'Introduction', href: '/getting-started/introduction', active: true },
            { label: 'Installation', href: '/getting-started/installation' },
        ]
    },
    {
        title: 'Core Concepts',
        items: [
            { label: 'Basic Usage', href: '/core-concepts/basic-usage' },
            { label: 'Configuration', href: '/core-concepts/configuration' },
        ]
    }
];

// Event Handlers
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth >= 1024) return; // lg breakpoint
    const target = e.target as HTMLElement;
    if (!sidebar.contains(target) && !sidebarToggle.contains(target)) {
        sidebar.classList.add('-translate-x-full');
    }
});

// Navigation
function renderNavigation() {
    navContent.innerHTML = navigation.map((section, idx) => `
    <div key="${idx}">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        ${section.title}
      </h3>
      <ul class="space-y-1">
        ${section.items.map((item) => `
          <li>
            <a
              href="${item.href}"
              class="block px-3 py-2 text-sm rounded-lg transition-colors ${item.active
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }"
            >
              ${item.label}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');

    attachNavListeners();
}

function attachNavListeners() {
    document.querySelectorAll('#nav-content a').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href') || '/';

            // Update active states
            document.querySelectorAll('#nav-content a').forEach(a => {
                a.classList.remove('bg-blue-50', 'text-blue-700', 'font-medium');
                a.classList.add('text-gray-700', 'hover:bg-gray-50', 'hover:text-gray-900');
            });

            (e.currentTarget as HTMLElement).classList.remove('text-gray-700', 'hover:bg-gray-50', 'hover:text-gray-900');
            (e.currentTarget as HTMLElement).classList.add('bg-blue-50', 'text-blue-700', 'font-medium');

            // Load content
            await loadContent(href);

            // Close sidebar on mobile
            if (window.innerWidth < 1024) {
                sidebar.classList.add('-translate-x-full');
            }
        });
    });
}

// Content Loading
async function loadContent(path: string) {
    try {
        const response = await fetch(`/content${path}.md`);
        if (!response.ok) throw new Error('Failed to load content');

        const markdown = await response.text();
        const html = marked(markdown);

        mainContent.innerHTML = `
      <article class="prose prose-lg max-w-none">
        ${html}
      </article>
    `;
    } catch (error) {
        console.error('Error loading content:', error);
        mainContent.innerHTML = `
      <div class="text-center py-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
        <p class="text-gray-600">The page you're looking for doesn't exist or has been moved.</p>
      </div>
    `;
    }
}

// Initialize
async function init() {
    renderNavigation();
    await loadContent('/getting-started/introduction');
}

init();