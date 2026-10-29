export type SearchType = 'text' | 'visual' | 'combined';

export interface SearchResult {
  id: string;
  type: 'photo' | 'product';
  score: number;
  textScore: number;
  visualScore: number;
  matchedFields: string[];
  highlights: Record<string, string>;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  searchType: SearchType;
  resultCount: number;
  createdAt: Date;
}

export interface SearchState {
  query: string;
  searchType: SearchType;
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  totalCount: number;
  page: number;
}

export interface TagRecord {
  id: string;
  name: string;
  usageCount: number;
}
