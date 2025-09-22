export enum NodeType {
  GENERATOR = 'GENERATOR',
  TRANSFORMER = 'TRANSFORMER',
  BUS = 'BUS',
  LOAD = 'LOAD',
  BREAKER = 'BREAKER',
  UNKNOWN = 'UNKNOWN',
}

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  properties?: {
    size?: string; // e.g., "100A", "50kW"
  };
  isExternal?: boolean; // For showing nodes outside a focused group
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link {
  source: string;
  target: string;
  properties?: {
    diameter?: string; // e.g., "4/0 AWG"
  };
  isBoundary?: boolean; // For styling links that cross group boundaries in focus mode
}

export interface Group {
  id: string;
  label: string;
  nodeIds: string[];
}

// FIX: Added Page interface to resolve type error in PageNavigator.tsx
export interface Page {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface DiagramData {
  nodes: Node[];
  links: Link[];
  groups?: Group[];
}
