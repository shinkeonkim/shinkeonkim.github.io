export type GraphNodeKind = 'doc' | 'tag';

export interface GraphNode {
  id: string;
  title: string;
  url: string;
  group?: string;
  kind?: GraphNodeKind;
  degree?: number;
  category?: string;
}

export type GraphLinkKind = 'wikilink' | 'tag';

export interface GraphLink {
  source: string;
  target: string;
  kind?: GraphLinkKind;
}
