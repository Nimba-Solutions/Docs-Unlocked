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

/**
 * Flow input variable type for Salesforce Screen Flows
 */
export interface FlowInputVariable {
  name: string;
  type: 'String' | 'Number' | 'Boolean' | 'Date' | 'DateTime' | 'SObject' | 'Apex';
  value: unknown;
}

/**
 * Flow status event from Salesforce
 */
export interface FlowStatusEvent {
  status: 'STARTED' | 'PAUSED' | 'FINISHED' | 'FINISHED_SCREEN' | 'ERROR';
  flowName: string;
  outputVariables?: Record<string, unknown>;
  errorMessage?: string;
}

/**
 * Embedded flow configuration parsed from :::flow blocks
 */
export interface EmbeddedFlow {
  flowName: string;
  inputs: FlowInputVariable[];
}