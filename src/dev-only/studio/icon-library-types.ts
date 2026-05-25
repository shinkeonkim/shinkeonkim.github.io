export type IconCategory =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'cloud'
  | 'database'
  | 'language'
  | 'frontend'
  | 'backend'
  | 'tool'
  | 'network'
  | 'erd'
  | 'arrow'
  | 'document'
  | 'device'
  | 'communication'
  | 'action'
  | 'chart'
  | 'shape'
  | 'user'
  | 'media'
  | 'finance'
  | 'crypto'
  | 'symbol'
  | 'tabler'
  | 'lucide';

export interface IconEntry {
  id: string;
  title: string;
  src: string;
  category: IconCategory;
}
