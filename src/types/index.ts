export interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export interface NavCard {
  title: string;
  description: string;
  href: string;
}

export interface DiscoveredFile {
  title: string;
  path: string;
  displayPath: string;
  order: number;
}

export interface NavigationItem {
  title: string;
  path: string;
  order?: number;
  children?: NavigationItem[];
}

export interface NavigationSection {
  title: string;
  path: string;
  order: number;
  children: NavigationItem[];
}

export interface SearchResult {
  title: string;
  path: string;
  snippet: string;
  searchQuery?: string;
}
