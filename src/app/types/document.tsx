export interface Document {
  pageContent: string;
  metadata: {
    id?: string;
    title: string;
    category: 'AI' | 'ML' | 'Startup' | 'Legal' | 'Technology' | 'AGI' | 'SaaS';
    type: 'article' | 'research' | 'case_study' | 'whitepaper' | 'documentation';
    tags: string[];
    metrics?: {
      mrr?: number;
      arr?: number;
      valuation?: number;
      growth_rate?: number;
    };
    author?: string;
    date: string;
    source_url?: string;
    confidence_score?: number;
    pageContent: string;
    [key: string]: any;
  };
}