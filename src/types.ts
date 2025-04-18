export interface OllamaService {
  server: string;
  models: string[];
  tps: number;
  lastUpdate: string;
  loading?: boolean;
  status: 'success' | 'error' | 'loading' | 'fake';
  isFake?: boolean;
}

export type SortField = 'tps' | 'lastUpdate';
export type SortOrder = 'asc' | 'desc'; 