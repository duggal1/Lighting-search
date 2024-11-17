/* eslint-disable react/jsx-no-undef */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { sanitizeString } from '@/lib/utils';
import { GenerateContentRequest, GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';

interface DocumentViewProps {
  document: {
    metadata: {
      title: string,
      plaintiff: string,
      defendant: string,
      date: string,
      topic: string,
      outcome: string,
      pageContent: string,
      chunkIndex?: number,
      totalChunks?: number,
      summary?: string,
      contentLength?: number,
      previousChunk?: string,
      nextChunk?: string
    },
    content: string
  },
  quote: string,
  onBack: () => void
}
interface SummaryMetrics {
  keyPoints: {
    point: string;
    confidence: number;
    support: string[];
  }[];
  legalPrinciples: {
    principle: string;
    applications: string[];
    precedents: string[];
    strength: 'strong' | 'moderate' | 'emerging';
  }[];
  impactMetrics: {
    societalImpact: {
      score: number;
      areas: string[];
      evidence: string[];
      trend: 'increasing' | 'stable' | 'decreasing';
    };
    legalSignificance: {
      score: number;
      keyFactors: string[];
      precedentialValue: string;
      jurisdictionalScope: string;
    };
    industryEffect: {
      score: string;
      sectors: string[];
      implications: string[];
      timeframe: 'immediate' | 'short-term' | 'long-term';
    };
    timelineRelevance: {
      currentScore: number;
      projectedScore: number;
      factors: string[];
      validityPeriod: string;
    };
  };
  quickStats: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
    confidence: number;
    context: string;
  }[];
}

// Calculate impact score based on various factors
const calculateImpactScore = (content: string, citationCount: number): number => {
  const impactFactors = {
    scope: (content.match(/\b(?:nationwide|global|widespread|universal|comprehensive)\b/gi) || []).length,
    significance: (content.match(/\b(?:significant|substantial|major|critical|important)\b/gi) || []).length,
    duration: (content.match(/\b(?:permanent|long-term|ongoing|sustained|lasting)\b/gi) || []).length,
    stakeholders: (content.match(/\b(?:public|community|industry|sector|population)\b/gi) || []).length,
    change: (content.match(/\b(?:change|transform|reform|modify|revise)\b/gi) || []).length
  };

  return Math.min(100, Math.round(
    (impactFactors.scope * 4) +
    (impactFactors.significance * 4) + 
    (impactFactors.duration * 3) +
    (impactFactors.stakeholders * 2) +
    (impactFactors.change * 2)
  ));
};

interface SummaryViewProps {
  document: DocumentViewProps['document'];
  enhancedContent?: EnhancedContent;
  metrics: any;
}

// Move all helper functions here (before the main component)
const determineTimeframe = (score: number): 'immediate' | 'short-term' | 'long-term' => {
  if (score >= 80) return 'immediate';
  if (score >= 50) return 'short-term';
  return 'long-term';
};

const extractAffectedSectors = (content: string): string[] => {
  const sectorPatterns = [
    /\b(?:financial|banking|insurance)\s+(?:sector|industry)\b/gi,
    /\b(?:technology|IT|software)\s+(?:sector|industry)\b/gi,
    /\b(?:healthcare|medical|pharmaceutical)\s+(?:sector|industry)\b/gi,
    // Add more sector patterns as needed
  ];
  
  const sectors = sectorPatterns.flatMap(pattern => 
    (content.match(pattern) || []).map(match => match.trim())
  );
  
  return [...new Set(sectors)];
};

// Define SummaryView component once, outside the main component
const SummaryView: React.FC<SummaryViewProps> = ({ document, enhancedContent, metrics }) => {
  const calculatedMetrics: Record<string, string | number> = useMemo(() => {
    // Calculate citation count
    const citationCount = (document.content.match(/\b\d+\s+[A-Z][a-z]+\s+\d+\b|\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b/g) || []).length;
    
    return {
      impactScore: calculateImpactScore(document.content, citationCount),
      complexityScore: calculateComplexityScore(document.content),
      implementationRate: calculateImplementationRate(document.content),
      industryInfluence: calculateIndustryInfluence(document.content, calculateImpactScore(document.content, citationCount))
    };
  }, [document, enhancedContent]);

  return (
    <div className="space-y-8">
      {/* Quick Stats Hero */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative">
          <h2 className="mb-4 font-bold text-3xl text-white">Key Metrics</h2>
          <div className="gap-6 grid grid-cols-2 md:grid-cols-4">
            {Object.entries(calculatedMetrics).map(([key, value], i) => (
              <div key={i} className="bg-white/10 backdrop-blur-xl p-4 rounded-xl">
                <div className="text-sm text-white/60">{key}</div>
                <div className="font-bold text-2xl text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Condensed Analysis */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl">
        <h3 className="mb-4 font-bold text-white text-xl">Quick Analysis</h3>
        <div className="max-w-none prose-invert prose">
          <ReactMarkdown>
            {enhancedContent?.summary || ''}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

interface KeyInsight {
  title: string,
  description: string,
  impact: string,
  precedents: string,
  future: string
}

interface RelatedTopic {
  name: string,
  relevance: string,
  caseRefs: string[],
  history: string,
  trends: string
}

interface Analysis {
  overview: string,
  precedentialValue: string,
  implications: string,
  challenges: string[]
}

interface EnhancedContent {
  enhancedContent: string,
  summary: string,
  keyInsights: KeyInsight[],
  relatedTopics: RelatedTopic[],
  analysis: Analysis
}

// Add a cache for Gemini results
const geminiCache = new Map<string, EnhancedContent>();

// Add this before the component
const CACHE_KEY = 'gemini_cache';

// Add this interface at the top with other interfaces
interface MarkdownBoxProps {
  title: string,
  content: string,
  gradient?: string
}

// Helper function to format analysis content
const formatAnalysis = (analysis: Analysis): string => {
  if (!analysis) return '';

  return `
## Analysis Overview
${analysis.overview}

## Precedential Value
${analysis.precedentialValue}

## Key Implications
${analysis.implications}

## Potential Challenges
${analysis.challenges.map(challenge => `- ${challenge}`).join('\n')}
`;
};//

const MarkdownBox: React.FC<MarkdownBoxProps> = ({ 
  title,
  content,
  gradient = "from-indigo-600 to-purple-600" 
}) => (
  <div className="relative group">
    {/* Animated gradient border */}
    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 opacity-75 group-hover:opacity-100 blur rounded-xl transition animate-gradient-xy duration-1000 group-hover:duration-200"></div>
    
    <div className="relative flex flex-col bg-white dark:bg-gray-900 p-1 rounded-xl">
      <div className="border-gray-100/20 dark:border-gray-700/20 bg-gray-50 dark:bg-gray-800 backdrop-blur-xl p-6 border-b rounded-t-xl">
        <h2 className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient} text-2xl font-black tracking-tight`}>
          {title}
        </h2>
      </div>
      
      <div className="bg-white dark:bg-gray-800 backdrop-blur-sm p-6 rounded-b-xl">
        <div className="max-w-none dark:prose-invert prose-lg">
          <ReactMarkdown
            className="text-gray-800 dark:text-gray-200"
            components={{
              p: ({children}) => <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>,
              h1: ({children}) => <h1 className="bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-6 font-black text-3xl text-transparent">{children}</h1>,
              h2: ({children}) => <h2 className="mb-4 font-bold text-gray-800 text-xl dark:text-gray-100">{children}</h2>,
              h3: ({children}) => <h3 className="mb-3 font-semibold text-gray-700 text-lg dark:text-gray-200">{children}</h3>,
              ul: ({children}) => <ul className="space-y-3 mb-6 pl-6 list-none">{children}</ul>,
              li: ({children}) => (
                <li className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full w-2 h-2"></span>
                  <span>{children}</span>
                </li>
              ),
            }}
          >
            {content || ''}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  </div>
);

// Add this utility function
const processMarkdown = (content: string | undefined): string => {
  if (!content) return '';
  
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1');
};

// Update the content mapping for insights
const formatInsights = (insights: KeyInsight[]): string => {
  return insights.map(insight => `
## ${insight.title || ''}
${insight.description || ''}

### Impact
${insight.impact || ''}

### Precedents
${insight.precedents || ''}

### Future Implications
${insight.future || ''}
  `).join('\n\n') || '';
};

// Update the content mapping for topics
const formatTopics = (topics: RelatedTopic[]): string => {
  return topics.map(topic => `
## ${topic.name || ''}
### Relevance
${topic.relevance || ''}

### Key Cases
${topic.caseRefs?.join('\n') || ''}

### Historical Context
${topic.history || ''}

### Current Trends
${topic.trends || ''}
  `).join('\n\n') || '';
};

// Add this at the top of the file, after the interfaces
const DEFAULT_METRICS: SummaryMetrics = {
  keyPoints: [],
  legalPrinciples: [],
  impactMetrics: {
    societalImpact: {
      score: 0,
      areas: [],
      evidence: [],
      trend: 'stable'
    },
    legalSignificance: {
      score: 0,
      keyFactors: [],
      precedentialValue: '',
      jurisdictionalScope: ''
    },
    industryEffect: {
      score: '0',
      sectors: [],
      implications: [], 
      timeframe: 'short-term'
    },
    timelineRelevance: {
      currentScore: 0,
      projectedScore: 0,
      factors: [],
      validityPeriod: ''
    }
  },
  quickStats: [{
    label: "Default Score",
    value: "0",
    trend: 'neutral',
    confidence: 0,
    context: "Initializing metrics"
  }]
};

export default function DocumentView({ document, quote, onBack }: DocumentViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentChunk, setCurrentChunk] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'full' | 'summary'>('full');
  const [showFullContext, setShowFullContext] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState<EnhancedContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const contentHash = useMemo(() => document.metadata.pageContent, [document.metadata.pageContent]);
  const [quickOverview, setQuickOverview] = useState<string>('');
  const [processedContent, setProcessedContent] = useState('');
  const [metrics, setMetrics] = useState<any>(null);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      const highlight = contentRef.current.querySelector('.highlight');
      if (highlight) {
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [quote, currentChunk]);

  // Function to highlight search terms in content
  const highlightSearchTerms = (content: string, searchTerms: string) => {
    if (!searchTerms) return content;
    const terms = searchTerms.split(' ').filter(term => term.length > 2);
    let highlightedContent = content;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedContent = highlightedContent.replace(
        regex,
        '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>'
      );
    });
    
    return highlightedContent;
  };

  // Format the content with proper paragraphs and sections
  const formatContent = (content: string) => {
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="mb-6 leading-relaxed">
        {paragraph}
      </p>
    ));
  };


// Add these helper functions at the top
const calculateMetrics = (document: DocumentViewProps['document'], enhancedContent?: EnhancedContent) => {
  const content = document.content;
  const metadata = document.metadata;

  // Calculate citation metrics
  const citations = content.match(/\b\d+\s+[A-Z][a-z]+\s+\d+\b/g) || [];
  const caseCitations = content.match(/\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b/g) || [];
  const statuteCitations = content.match(/\b\d+\s+U\.S\.C\.\s+§\s+\d+\b/g) || [];
  
  const citationCount = citations.length + caseCitations.length + statuteCitations.length;
  const complexityScore = calculateComplexityScore(content);
  const impactScore = calculateImpactScore(content, citationCount);
  const implementationRate = calculateImplementationRate(content);
  
  // Ensure all values are properly formatted
  return {
    impactScore: `${impactScore}/100`,
    citationCount: citationCount.toString(),
    precedentialWeight: `${calculatePrecedentialWeight(citationCount, impactScore, content)}/100`,
    implementationRate: `${implementationRate}%`,
    industryInfluence: calculateIndustryInfluence(content, impactScore),
    complexityScore: `${complexityScore}/100`,
    jurisdictionalReach: calculateJurisdictionalReach(content),
    academicCitations: calculateAcademicCitations(content).toString(),
    practiceAreaImpact: calculatePracticeAreaImpact(impactScore, content),
    futureRelevanceScore: calculateFutureRelevance(impactScore, metadata.date)
  };
};

// First, define the MetricsSection components
interface MetricsSectionProps {
  title: string;
  metrics: any; // We'll type this specifically for each section
}

const MetricsSection: React.FC<MetricsSectionProps> = ({ title, metrics }) => (
  <div className="bg-white shadow-sm p-6 rounded-xl">
    <h3 className="mb-4 font-semibold text-xl">{title}</h3>
    <div className="space-y-4">
      {Array.isArray(metrics) ? (
        metrics.map((metric, index) => (
          <div key={index} className="border-indigo-500 pl-4 border-l-4">
            <div className="font-medium">{metric.point || metric.principle}</div>
            <div className="mt-1 text-gray-600 text-sm">
              Confidence: {metric.confidence}%
              {metric.support && (
                <div className="mt-1">
                  Evidence: {metric.support.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div>No metrics available</div>
      )}
    </div>
  </div>
);
interface ImpactCardProps {
  title: string;
  score: number;
  areas?: string[];
  trend?: string;
  factors?: string[];
  scope?: string;
}

const ImpactCard: React.FC<ImpactCardProps> = ({ title, score, areas, trend, factors, scope }) => (
  <div className="shadow p-4 border rounded-lg">
    <h4 className="font-semibold">{title}</h4>
    <p>Score: {score}</p>
    {areas && <p>Areas: {areas.join(', ')}</p>}
    {trend && <p>Trend: {trend}</p>}
    {factors && <p>Key Factors: {factors.join(', ')}</p>}
    {scope && <p>Jurisdictional Scope: {scope}</p>}
  </div>
);

const ImpactMetricsSection: React.FC<{ metrics: SummaryMetrics['impactMetrics'] }> = ({ metrics }) => (
  <div className="bg-white shadow-sm p-6 rounded-xl">
    <h3 className="mb-4 font-semibold text-xl">Impact Analysis</h3>
    <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
      <ImpactCard
        title="Societal Impact"
        score={safeMetricAccess(metrics, 'impactMetrics.societalImpact.score', 0)}
        areas={safeMetricAccess(metrics, 'impactMetrics.societalImpact.areas', [])}
        trend={safeMetricAccess(metrics, 'impactMetrics.societalImpact.trend', 'stable')}
      />
      <ImpactCard 
        title="Legal Significance"
        score={safeMetricAccess(metrics, 'impactMetrics.legalSignificance.score', 0)}
        factors={safeMetricAccess(metrics, 'impactMetrics.legalSignificance.keyFactors', [])}
        scope={safeMetricAccess(metrics, 'impactMetrics.legalSignificance.jurisdictionalScope', 'N/A')}
      />
    </div>
  </div>
);

const QuickStatsSection: React.FC<{ stats: SummaryMetrics['quickStats'] }> = ({ stats }) => (
  <div className="bg-white shadow-sm p-6 rounded-xl">
    <h3 className="mb-4 font-semibold text-xl">Quick Stats</h3>
    <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
      {stats.map((stat, index) => (
        <div key={index} className="bg-gray-50 p-4 rounded-lg">
          <div className="text-gray-600 text-sm">{stat.label}</div>
          <div className="mt-1 font-semibold text-xl">
            {stat.value}
            <span className="ml-2 text-sm">
              {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'}
            </span>
          </div>
          <div className="mt-1 text-gray-500 text-xs">
            Confidence: {stat.confidence}%
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Add the missing calculation functions
const calculateTimelineRelevance = (date: string, baseMetrics: any) => {
  const documentDate = new Date(date);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - documentDate.getFullYear()) * 12 + 
                    (now.getMonth() - documentDate.getMonth());

  return {
    currentScore: Math.max(0, 100 - (monthsDiff * 0.5)),
    projectedScore: Math.max(0, 90 - (monthsDiff * 0.3)),
    factors: extractTimelineFactors(monthsDiff),
    validityPeriod: determineValidityPeriod(monthsDiff, baseMetrics)
  };
};

const calculateIndustryEffect = (document: DocumentViewProps['document'], enhancedContent?: EnhancedContent) => {
  const content = document.content;
  const industryTerms = extractIndustryTerms(content);
  const impactScore = calculateIndustryImpactScore(content);
  
  return {
    score: impactScore,
    sectors: extractAffectedSectors(content),
    implications: extractIndustryImplications(content),
    timeframe: determineIndustryTimeframe(content)
  };
};

const extractIndustryImplications = (content: string): string[] => {
  const implications: Iterable<any> | null | undefined = [];
  
  // Look for sentences containing impact-related keywords
  const impactSentences = content.match(/[^.!?]+(?:impact|affect|change|transform|influence)[^.!?]+[.!?]/gi) || [];
  
  // Extract implications from matched sentences
  const implicationsArray: string[] = [];
  impactSentences.forEach(sentence => {
    if (sentence.match(/\b(?:industry|sector|business|market)\b/i)) {
      implicationsArray.push(sentence.trim());
    }
  });

  return [...new Set(implicationsArray)].slice(0, 3); // Return up to 3 unique implications
};

const determineIndustryTimeframe = (content: string): string => {
  const shortTermKeywords = /\b(?:immediate|short-term|near-term|current|ongoing)\b/i;
  const mediumTermKeywords = /\b(?:medium-term|mid-term|coming years|next few years)\b/i;
  const longTermKeywords = /\b(?:long-term|future|years ahead|decade)\b/i;
  
  if (content.match(shortTermKeywords)) {
    return "Short-term (0-12 months)";
  } else if (content.match(mediumTermKeywords)) {
    return "Medium-term (1-3 years)";
  } else if (content.match(longTermKeywords)) {
    return "Long-term (3+ years)";
  }
  
  return "Medium-term (1-3 years)"; // Default if no specific timeframe is detected
};

// Helper functions for the above calculations
const extractTimelineFactors = (monthsDiff: number): string[] => {
  const factors = [];
  if (monthsDiff < 12) factors.push('Recent Development');
  if (monthsDiff < 24) factors.push('Active Implementation Phase');
  if (monthsDiff < 36) factors.push('Established Precedent');
  return factors;
};

const determineValidityPeriod = (monthsDiff: number, baseMetrics: any): string => {
  const impactScore = parseInt(baseMetrics.impactScore);
  if (impactScore > 80) return 'Long-term (5+ years)';
  if (impactScore > 60) return 'Medium-term (2-5 years)';
  return 'Short-term (1-2 years)';
};

const extractIndustryTerms = (content: string): string[] => {
  const terms = content.match(/\b(?:industry|sector|market|business|commercial)\b[^.]+\./gi) || [];
  return [...new Set(terms)].slice(0, 5);
};

const calculateIndustryImpactScore = (content: string): number => {
  const factors = {
    marketTerms: (content.match(/\b(?:market|industry|sector|business)\b/gi) || []).length,
    regulatoryImpact: (content.match(/\b(?:regulate|compliance|standard|requirement)\b/gi) || []).length,
    economicEffect: (content.match(/\b(?:economic|financial|cost|revenue|profit)\b/gi) || []).length
  };
  
  return Math.min(100, 
    (factors.marketTerms * 3) + 
    (factors.regulatoryImpact * 4) + 
    (factors.economicEffect * 3)
  );
};

const getAffectedSectors = (content: string): string[] => {
  const sectorPatterns = [
    /\b(?:financial|banking|insurance)\s+(?:sector|industry)\b/gi,
    /\b(?:technology|IT|software)\s+(?:sector|industry)\b/gi,
    /\b(?:healthcare|medical|pharmaceutical)\s+(?:sector|industry)\b/gi,
    // Add more sector patterns as needed
  ];
  
  const sectors = sectorPatterns.flatMap(pattern => 
    (content.match(pattern) || []).map(match => match.trim())
  );
  
  return [...new Set(sectors)];
};
// Helper functions for detailed calculations
const calculateJurisdictionalReach = (content: string): string => {
  const jurisdictionKeywords = {
    national: ['Supreme Court', 'federal', 'nationwide', 'United States'],
    regional: ['Circuit Court', 'district', 'state court'],
    local: ['municipal', 'county', 'local']
  };

  let score = 0;
  for (const keyword of jurisdictionKeywords.national) {
    if (content.includes(keyword)) score += 3;
  }
  for (const keyword of jurisdictionKeywords.regional) {
    if (content.includes(keyword)) score += 2;
  }
  for (const keyword of jurisdictionKeywords.local) {
    if (content.includes(keyword)) score += 1;
  }

  return score > 5 ? "National" : score > 3 ? "Regional" : "Local";
};

const calculateAcademicCitations = (content: string): number => {
  // Academic citation patterns
  const patterns = [
    /\b\d{4}\s+J\.\s+L\.\s+REV\./gi,                    // Journal Law Review
    /\b\d{4}\s+[A-Z][A-Za-z]+\s+L\.\s+REV\./gi,        // Named Law Reviews
    /\b\d{4}\s+[A-Z][A-Za-z]+\s+J\.\s+L\./gi,          // Law Journals
    /\b(?:See|See,\s+e\.g\.|Cf\.|Compare)\s+[A-Z]/g,    // Academic references
    /\b(?:supra|infra)\s+note\s+\d+/gi,                 // Footnote references
    /\b(?:et\s+al\.|id\.|ibid\.)(?:\s+at\s+\d+)?/gi,   // Common academic citations
    /\b[A-Z][a-z]+,\s+[A-Z][a-z]+\s+&\s+[A-Z][a-z]+\s+\(\d{4}\)/g, // Author citations
    /\b\d{4}\s+[A-Z][A-Za-z]+\s+STUD\./gi,             // Studies
    /\b\d{4}\s+[A-Z][A-Za-z]+\s+Q\./gi,                // Quarterly publications
    /\bvol\.\s+\d+/gi                                   // Volume references
  ];

  // Count matches for each pattern
  const citationCount = patterns.reduce((total, pattern) => {
    const matches = content.match(pattern) || [];
    return total + matches.length;
  }, 0);

  // Weight different types of citations
  const weightedScore = Math.min(100, citationCount * 2);
  
  return weightedScore;
};

const calculatePracticeAreaImpact = (impactScore: number, content: string): string => {
  // Define practice areas and their keywords
  const practiceAreas = {
    constitutional: ['constitution', 'constitutional', 'fundamental rights', 'civil rights', 'due process'],
    criminal: ['criminal', 'prosecution', 'defendant', 'felony', 'misdemeanor', 'sentence'],
    corporate: ['corporation', 'business', 'securities', 'shareholders', 'merger', 'acquisition'],
    environmental: ['environmental', 'pollution', 'conservation', 'EPA', 'climate'],
    intellectual: ['patent', 'copyright', 'trademark', 'intellectual property', 'IP'],
    administrative: ['agency', 'regulation', 'administrative', 'regulatory', 'compliance'],
    civil: ['tort', 'contract', 'liability', 'damages', 'negligence'],
    international: ['international', 'treaty', 'foreign', 'diplomatic', 'sovereignty']
  };

  // Calculate impact for each practice area
  const areaScores = Object.entries(practiceAreas).map(([area, keywords]) => {
    const matches = keywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      return count + (content.match(regex) || []).length;
    }, 0);

    // Weight the score based on matches and overall impact
    const weightedScore = matches * (impactScore / 100);
    return { area, score: weightedScore };
  });

  // Sort areas by score and get top 3
  const topAreas = areaScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter(area => area.score > 0);

  if (topAreas.length === 0) return "General Practice";

  // Format the result based on impact levels
  const formatImpact = (score: number): string => {
    if (score > 20) return "High";
    if (score > 10) return "Moderate";
    return "Limited";
  };

  return topAreas
    .map(({ area, score }) => `${area.charAt(0).toUpperCase() + area.slice(1)} (${formatImpact(score)})`)
    .join(", ");
};

const calculateFutureRelevance = (impactScore: number, dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const yearsDiff = now.getFullYear() - date.getFullYear();
  
  // Base relevance factors
  const factors = {
    recency: Math.max(0, 100 - (yearsDiff * 5)), // Newer cases start with higher relevance
    impact: impactScore, // Higher impact cases maintain relevance longer
    timeWeight: Math.max(0, 100 - (yearsDiff * 2)) // Time decay factor
  };

  // Calculate weighted relevance score
  const relevanceScore = Math.round(
    (factors.recency * 0.4) +    // 40% weight for recency
    (factors.impact * 0.4) +     // 40% weight for impact
    (factors.timeWeight * 0.2)   // 20% weight for time decay
  );

  // Determine trend direction
  const trendDirection = relevanceScore > 70 ? "↑" :
                        relevanceScore > 40 ? "→" : "↓";

  // Format the score with qualitative assessment
  if (relevanceScore >= 80) {
    return `High (${relevanceScore}/100) ${trendDirection}`;
  } else if (relevanceScore >= 60) {
    return `Significant (${relevanceScore}/100) ${trendDirection}`;
  } else if (relevanceScore >= 40) {
    return `Moderate (${relevanceScore}/100) ${trendDirection}`;
  } else if (relevanceScore >= 20) {
    return `Limited (${relevanceScore}/100) ${trendDirection}`;
  } else {
    return `Historical (${relevanceScore}/100) ${trendDirection}`;
  }
};

// Enhanced SummaryMetrics interface and implementation
interface SummaryMetrics {
  keyPoints: {
    point: string;
    confidence: number;
    support: string[];
  }[];
  legalPrinciples: {
    principle: string;
    applications: string[];
    precedents: string[];
    strength: 'strong' | 'moderate' | 'emerging';
  }[];
  impactMetrics: {
    societalImpact: {
      score: number;
      areas: string[];
      evidence: string[];
      trend: 'increasing' | 'stable' | 'decreasing';
    };
    legalSignificance: {
      score: number;
      keyFactors: string[];
      precedentialValue: string;
      jurisdictionalScope: string;
    };
    industryEffect: {
      score: number;
      sectors: string[];
      implications: string[];
      timeframe: 'immediate' | 'short-term' | 'long-term';
    };
    timelineRelevance: {
      currentScore: number;
      projectedScore: number;
      factors: string[];
      validityPeriod: string;
    };
  };
  quickStats: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
    confidence: number;
    context: string;
  }[];
}

// Function to calculate comprehensive summary metrics
const calculateSummaryMetrics = (document: DocumentViewProps['document'], enhancedContent?: EnhancedContent): SummaryMetrics => {
  const content = document.content;
  const baseMetrics = calculateMetrics(document, enhancedContent);

  // Calculate timelineRelevance
  const timelineRelevance = {
    currentScore: parseInt(baseMetrics.impactScore),
    projectedScore: Math.min(100, parseInt(baseMetrics.impactScore) * 1.2),
    factors: extractLegalFactors(content),
    validityPeriod: calculateFutureRelevance(parseInt(baseMetrics.impactScore), document.metadata.date)
  };

  // Calculate industryEffect
  const industryEffect = {
    score: parseInt(baseMetrics.industryInfluence),
    sectors: extractAffectedSectors(content),
    implications: [baseMetrics.practiceAreaImpact],
    timeframe: determineTimeframe(parseInt(baseMetrics.impactScore)) as 'immediate' | 'short-term' | 'long-term'
  };
  // Extract key points from content
  const extractKeyPoints = (content: string, enhancedContent?: EnhancedContent): string[] => {
    const keyPoints = [];
    // Extract sentences with key terms
    const keyTerms = content.match(/\b(?:importantly|significantly|notably|key|critical|essential)\b[^.]+\./gi) || [];
    keyPoints.push(...keyTerms);
    return [...new Set(keyPoints)];
  };

  // Analyze legal principles from content
  const analyzeLegalPrinciples = (content: string, enhancedContent?: EnhancedContent): string[] => {
    const principles = [];
    // Extract legal doctrine references
    const doctrines = content.match(/\b(?:doctrine|principle|rule|standard|test)\s+of\s+[^.]+\./gi) || [];
    principles.push(...doctrines);
    return [...new Set(principles)];
  };

  // Calculate societal impact score
  const calculateSocietalImpact = (content: string, baseMetrics: any) => {
    const societalFactors = {
      publicInterest: (content.match(/\b(?:public|society|community|population|citizen)\b/gi) || []).length,
      socialImpact: (content.match(/\b(?:impact|effect|influence|change|consequence)\b/gi) || []).length
    };
    const score = Math.min(100, (societalFactors.publicInterest * 3) + (societalFactors.socialImpact * 2));
    return {
      score,
      areas: ['Public Policy', 'Social Welfare', 'Community Impact'],
      evidence: extractSocietalEvidence(content),
      trend: determineTrend(score, content) as 'increasing' | 'stable' | 'decreasing'
    };
  };

  // Calculate legal significance
  const calculateLegalSignificance = (content: string, baseMetrics: any) => {
    const legalFactors = {
      precedent: (content.match(/\b(?:precedent|ruling|decision|holding|judgment)\b/gi) || []).length,
      authority: (content.match(/\b(?:court|tribunal|authority|jurisdiction)\b/gi) || []).length
    };
    const score = Math.min(100, (legalFactors.precedent * 4) + (legalFactors.authority * 3));
    return {
      score,
      keyFactors: ['Precedential Value', 'Jurisdictional Authority'],
      precedentialValue: score > 75 ? 'High' : score > 50 ? 'Medium' : 'Low',
      jurisdictionalScope: 'Federal'
    };
  };

  // Generate quick stats summary
  const generateQuickStats = (baseMetrics: any, document: any): any[] => {
    return [
      {
        label: "Impact Score",
        value: `${baseMetrics.impactScore}/100`,
        trend: baseMetrics.impactScore > 75 ? 'up' : 'neutral',
        confidence: 0.8,
        context: "Based on comprehensive analysis"
      }
    ];
  };

  // Extract key points with confidence and support
  const extractKeyPointsWithMetadata = (content: string, enhancedContent?: EnhancedContent) => {
    const rawPoints = extractKeyPoints(content, enhancedContent);
    return rawPoints.map(point => ({
      point,
      confidence: 0.8,
      support: [point] // Add supporting evidence here
    }));
  };

  // Analyze legal principles with metadata
  const analyzeLegalPrinciplesWithMetadata = (content: string, enhancedContent?: EnhancedContent) => {
    const rawPrinciples = analyzeLegalPrinciples(content, enhancedContent);
    return rawPrinciples.map(principle => ({
      principle,
      applications: [principle], // Add specific applications
      precedents: [], // Add relevant precedents
      strength: 'moderate' as 'strong' | 'moderate' | 'emerging'
    }));
  };

  // Return complete SummaryMetrics object
  return {
    keyPoints: extractKeyPointsWithMetadata(content, enhancedContent),
    legalPrinciples: analyzeLegalPrinciplesWithMetadata(content, enhancedContent),
    impactMetrics: {
      societalImpact: calculateSocietalImpact(content, baseMetrics),
      legalSignificance: calculateLegalSignificance(content, baseMetrics),
      industryEffect,
      timelineRelevance
    },
    quickStats: generateQuickStats(baseMetrics, document)
  };
};

// Add missing helper function
const extractAffectedSectors = (content: string): string[] => {
  const sectorPatterns = [
    /\b(?:financial|banking|insurance)\s+(?:sector|industry)\b/gi,
    /\b(?:technology|IT|software)\s+(?:sector|industry)\b/gi,
    /\b(?:healthcare|medical|pharmaceutical)\s+(?:sector|industry)\b/gi,
    // Add more sector patterns as needed
  ];
  
  const sectors = sectorPatterns.flatMap(pattern => 
    (content.match(pattern) || []).map(match => match.trim())
  );
  
  return [...new Set(sectors)];
};

// Update SummaryView component to handle the metrics properly
const SummaryView = ({ document, enhancedContent }: { 
  document: DocumentViewProps['document'], 
  enhancedContent?: EnhancedContent 
}) => {
  const metrics = useMemo(() => calculateMetrics(document, enhancedContent), [document, enhancedContent]);
  
  return (
    <div className="space-y-8">
      {/* Quick Stats Hero */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative">
          <h2 className="mb-4 font-bold text-3xl text-white">Key Metrics</h2>
          <div className="gap-6 grid grid-cols-2 md:grid-cols-4">
            {Object.entries(metrics).map(([key, value], i) => (
              <div key={i} className="bg-white/10 backdrop-blur-xl p-4 rounded-xl">
                <div className="text-sm text-white/60">{key}</div>
                <div className="font-bold text-2xl text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Condensed Analysis */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl">
        <h3 className="mb-4 font-bold text-white text-xl">Quick Analysis</h3>
        <div className="max-w-none prose-invert prose">
          <ReactMarkdown>
            {enhancedContent?.summary || ''}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// Add these helper components
const AnalysisCard = ({ 
  title, 
  items 
}: { 
  title: string, 
  items: { label: string, value: string }[] 
}) => (
  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
    <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-gray-100">{title}</h3>
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex justify-between items-center">
          <span className="text-gray-500 text-sm dark:text-gray-400">{item.label}</span>
          <span className="font-medium text-gray-900 text-sm dark:text-gray-100">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const TimelineAnalysis = ({ document }: { document: DocumentViewProps['document'] }) => {
  const timelinePoints = useMemo(() => {
    const date = new Date(document.metadata.date);
    return [
      {
        date: date.toLocaleDateString(),
        label: 'Document Published',
        description: 'Initial release and implementation'
      },
      {
        date: new Date(date.getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        label: 'Short-term Impact',
        description: 'Initial industry response and adoption'
      },
      {
        date: new Date(date.getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        label: 'Long-term Effects',
        description: 'Sustained influence and precedential value'
      }
    ];
  }, [document.metadata.date]);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
      <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-gray-100">Timeline Analysis</h3>
      <div className="space-y-4">
        {timelinePoints.map((point, i) => (
          <div key={i} className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-24 text-gray-500 text-sm">{point.date}</div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{point.label}</div>
              <div className="text-gray-500 text-sm dark:text-gray-400">{point.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


const calculateComplexityScore = (content: string): number => {
  const factors = {
    legalTerms: (content.match(/\b(?:pursuant|whereas|hereinafter|aforementioned|notwithstanding)\b/gi) || []).length,
    longSentences: content.split(/[.!?]+/).filter(sentence => sentence.split(' ').length > 30).length,
    citations: (content.match(/\b\d+\s+[A-Z][a-z]+\s+\d+\b|\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b/g) || []).length,
    sections: (content.match(/\b(?:Section|Article|Paragraph)\s+\d+/gi) || []).length,
    subclauses: (content.match(/\([a-z]\)|\([0-9]\)|\([iv]+\)/gi) || []).length
  };

  return Math.min(100, Math.round(
    (factors.legalTerms * 2) +
    (factors.longSentences * 3) +
    (factors.citations * 2) +
    (factors.sections * 1.5) +
    (factors.subclauses * 1.5)
  ));
};

const calculateImplementationRate = (content: string): number => {
  const implementationFactors = {
    // Direct implementation language
    directImplementation: (content.match(/\b(?:implemented|enacted|established|instituted|adopted)\b/gi) || []).length,
    
    // Compliance indicators
    compliance: (content.match(/\b(?:comply|conformity|accordance|adherence|compliance)\b/gi) || []).length,
    
    // Enforcement language
    enforcement: (content.match(/\b(?:enforce|mandate|require|compel|obligate)\b/gi) || []).length,
    
    // Timeline indicators
    timeline: (content.match(/\b(?:effective|commence|begin|start|initiate)\s+(?:on|from|after|by)\b/gi) || []).length,
    
    // Success metrics
    success: (content.match(/\b(?:successful|achieved|completed|fulfilled|satisfied)\b/gi) || []).length
  };

  // Calculate weighted implementation rate
  const rate = Math.min(100, Math.round(
    (implementationFactors.directImplementation * 4) +
    (implementationFactors.compliance * 3) +
    (implementationFactors.enforcement * 3) +
    (implementationFactors.timeline * 2) +
    (implementationFactors.success * 3)
  ));

  return rate;
};

const calculateIndustryInfluence = (content: string, impactScore: number): string => {
  const industryFactors = {
    // Industry-specific terms
    industryTerms: (content.match(/\b(?:industry|sector|market|business|commercial|trade)\b/gi) || []).length,
    
    // Economic impact
    economicImpact: (content.match(/\b(?:economic|financial|monetary|fiscal|revenue|cost)\b/gi) || []).length,
    
    // Stakeholder references
    stakeholders: (content.match(/\b(?:stakeholder|participant|entity|corporation|company|firm)\b/gi) || []).length,
    
    // Regulatory impact
    regulation: (content.match(/\b(?:regulate|oversight|compliance|standard|requirement)\b/gi) || []).length,
    
    // Market effect
    marketEffect: (content.match(/\b(?:market|competition|competitive|supply|demand)\b/gi) || []).length
  };

  const influenceScore = Math.min(10, Math.round(
    ((industryFactors.industryTerms * 0.4) +
    (industryFactors.economicImpact * 0.3) +
    (industryFactors.stakeholders * 0.2) +
    (industryFactors.regulation * 0.3) +
    (industryFactors.marketEffect * 0.3) +
    (impactScore * 0.05)) * 10) / 10
  );
//
  return `${influenceScore.toFixed(1)}/10`;
};

const calculateConfidence = (description: string): number => {
  const confidenceFactors = {
    citations: (description.match(/\b\d+\s+[A-Z][a-z]+\s+\d+\b/g) || []).length * 10,
    legalTerms: (description.match(/\b(?:pursuant|whereas|hereinafter|notwithstanding)\b/gi) || []).length * 5,
    precedents: (description.match(/\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b/g) || []).length * 8,
    specificity: (description.match(/\b(?:specifically|particularly|notably|expressly)\b/gi) || []).length * 4,
    evidence: (description.match(/\b(?:evidence|proof|demonstration|showing)\b/gi) || []).length * 6
  };

  return Math.min(100, Object.values(confidenceFactors).reduce((sum, score) => sum + score, 0));
};

const extractImpactAreas = (content: string): string[] => {
  const impactPatterns = {
    legal: {
      pattern: /\b(?:legal|judicial|constitutional|statutory)\s+(?:framework|system|process)\b/gi,
      weight: 2
    },
    social: {
      pattern: /\b(?:social|public|community|societal)\s+(?:impact|effect|change)\b/gi,
      weight: 1.5
    },
    economic: {
      pattern: /\b(?:economic|financial|monetary|fiscal)\s+(?:impact|effect)\b/gi,
      weight: 1.5
    },
    regulatory: {
      pattern: /\b(?:regulatory|compliance|enforcement|oversight)\s+(?:framework|system)\b/gi,
      weight: 1.8
    }
  };

  return Object.entries(impactPatterns)
    .map(([area, { pattern, weight }]) => ({
      area,
      score: (content.match(pattern) || []).length * weight
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ area }) => area);
};

const extractSocietalEvidence = (content: string): string[] => {
  const evidenceTypes = {
    statistics: content.match(/\b\d+(?:\.\d+)?%\s+(?:of|increase|decrease)[^.]+\./gi) || [],
    impacts: content.match(/\b(?:affects|impacts|influences)\s+(?:society|public|community)[^.]+\./gi) || [],
    demographics: content.match(/\b(?:population|community|group|demographic)[^.]+affected[^.]+\./gi) || [],
    outcomes: content.match(/\b(?:results|outcomes|consequences|effects)[^.]+society[^.]+\./gi) || [],
    benefits: content.match(/\b(?:benefits|advantages|improvements)[^.]+public[^.]+\./gi) || []
  };

  return [...new Set(Object.values(evidenceTypes).flat())].slice(0, 5);
};

const determineTrend = (impactScore: number, content: string): 'increasing' | 'stable' | 'decreasing' => {
  const trendIndicators = {
    increasing: {
      patterns: [
        /\b(?:increase|rise|grow|expand|strengthen)\b/gi,
        /\b(?:more|greater|higher|enhanced)\b/gi,
        /\b(?:future|upcoming|forthcoming)\b/gi
      ],
      score: 0
    },
    decreasing: {
      patterns: [
        /\b(?:decrease|decline|reduce|diminish)\b/gi,
        /\b(?:less|fewer|lower|limited)\b/gi,
        /\b(?:obsolete|outdated|superseded)\b/gi
      ],
      score: 0
    },
    stable: {
      patterns: [
        /\b(?:maintain|continue|persist|remain)\b/gi,
        /\b(?:consistent|stable|steady|unchanged)\b/gi,
        /\b(?:established|settled|fixed)\b/gi
      ],
      score: 0
    }
  };

  // Calculate weighted scores
  Object.entries(trendIndicators).forEach(([trend, data]) => {
    data.patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      trendIndicators[trend as keyof typeof trendIndicators].score += matches.length;
    });
  });

  const weightedScores = {
    increasing: trendIndicators.increasing.score * (impactScore / 50),
    stable: trendIndicators.stable.score,
    decreasing: trendIndicators.decreasing.score * (impactScore / 50)
  };

  return Object.entries(weightedScores)
    .sort(([, a], [, b]) => b - a)[0][0] as 'increasing' | 'stable' | 'decreasing';
};

const determineTrendFromScore = (score: number): 'up' | 'down' | 'neutral' => {
  if (score >= 70) return 'up';
  if (score <= 30) return 'down';
  return 'neutral';
};

const calculateConfidenceScore = (baseMetrics: any): number => {
  const factors = {
    citationStrength: Math.min(50, baseMetrics.citationCount * 2),
    implementationClarity: parseInt(baseMetrics.implementationRate) * 0.3,
    precedentialWeight: baseMetrics.precedentialWeight === 'High' ? 20 : 
                       baseMetrics.precedentialWeight === 'Moderate' ? 10 : 5,
    complexityScore: parseInt(baseMetrics.complexityScore) * 0.2
  };

  return Math.min(100, Object.values(factors).reduce((sum, score) => sum + score, 0));
};

const calculateImplementationConfidence = (content: string): number => {
  const implementationFactors = {
    specificSteps: (content.match(/\b(?:step|phase|stage)\s+\d+\b/gi) || []).length * 5,
    timeframes: (content.match(/\b(?:within|by|after)\s+\d+\s+(?:days|months|years)\b/gi) || []).length * 4,
    requirements: (content.match(/\b(?:must|shall|required|mandatory)\b/gi) || []).length * 3,
    monitoring: (content.match(/\b(?:monitor|track|assess|evaluate)\b/gi) || []).length * 3,
    enforcement: (content.match(/\b(?:enforce|penalty|sanction|compliance)\b/gi) || []).length * 4
  };

  return Math.min(100, Object.values(implementationFactors)
    .reduce((sum, score) => sum + score, 0));
};

const extractImplementationMetrics = (content: string): string[] => {
  const metrics = [
    // Quantitative metrics
    ...(content.match(/\b\d+(?:\.\d+)?%\s+(?:compliance|implementation|adoption)\b[^.]+\./gi) || []),
    // Timeline metrics
    ...(content.match(/\b(?:within|by)\s+\d+\s+(?:days|months|years)[^.]+\./gi) || []),
    // Progress indicators
    ...(content.match(/\b(?:progress|milestone|achievement|completion)[^.]+\d+[^.]+\./gi) || []),
    // Compliance metrics
    ...(content.match(/\b(?:compliance|adherence|conformity)\s+(?:rate|level|measure)[^.]+\./gi) || []),
    // Success metrics
    ...(content.match(/\b(?:success|effectiveness|performance)\s+(?:rate|measure|metric)[^.]+\./gi) || [])
  ];

  return [...new Set(metrics)];
};

// Rename to avoid redeclaration
const extractSocietalImpactEvidence = (content: string): string[] => {
  const evidence = [];
  
  // Extract statistical evidence
  const stats = content.match(/\b\d+(?:\.\d+)?%\s+(?:of|increase|decrease)[^.]+\./gi) || [];
  evidence.push(...stats);

  // Extract impact statements
  const impacts = content.match(/\b(?:affects|impacts|influences)\s+(?:the|all|many|numerous)[^.]+\./gi) || [];
  evidence.push(...impacts);

  // Extract demographic references
  const demographics = content.match(/\b(?:population|community|group|demographic)[^.]+affected[^.]+\./gi) || [];
  evidence.push(...demographics);

  return [...new Set(evidence)].slice(0, 5);
};

const getTrend = (impactScore: number, content: string): 'increasing' | 'stable' | 'decreasing' => {
  const trendIndicators = {
    increasing: {
      patterns: [
        /\b(?:increase|rise|grow|expand|strengthen)\b/gi,
        /\b(?:more|greater|higher|enhanced)\b/gi,
        /\b(?:future|upcoming|forthcoming|prospective)\b/gi
      ],
      score: 0
    },
    decreasing: {
      patterns: [
        /\b(?:decrease|decline|reduce|diminish|weaken)\b/gi,
        /\b(?:less|fewer|lower|limited)\b/gi,
        /\b(?:obsolete|outdated|superseded)\b/gi
      ],
      score: 0
    },
    stable: {
      patterns: [
        /\b(?:maintain|continue|persist|remain|stay)\b/gi,
        /\b(?:consistent|stable|steady|unchanged)\b/gi,
        /\b(?:established|settled|fixed)\b/gi
      ],
      score: 0
    }
  };

  // Calculate scores for each trend
  Object.keys(trendIndicators).forEach(trend => {
    trendIndicators[trend as keyof typeof trendIndicators].patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      trendIndicators[trend as keyof typeof trendIndicators].score += matches.length;
    });
  });

  // Weight the scores with the impact score
  const weightedScores = {
    increasing: trendIndicators.increasing.score * (impactScore / 50),
    stable: trendIndicators.stable.score,
    decreasing: trendIndicators.decreasing.score * (impactScore / 50)
  };

  // Determine the highest score
  const trend = Object.entries(weightedScores)
    .sort(([, a], [, b]) => b - a)[0][0] as 'increasing' | 'stable' | 'decreasing';

  return trend;
};

const getImplementationConfidence = (content: string): number => {
  const implementationFactors = {
    // Clear implementation steps
    steps: (content.match(/\b(?:step|phase|stage|process)\s+\d+\b/gi) || []).length * 5,
    // Timeline references
    timelines: (content.match(/\b(?:within|by|after|before)\s+\d+\s+(?:days|months|years)\b/gi) || []).length * 4,
    
    // Specific requirements
    requirements: (content.match(/\b(?:must|shall|required|mandatory|necessary)\b/gi) || []).length * 3,
    
    // Monitoring provisions
    monitoring: (content.match(/\b(?:monitor|track|assess|evaluate|review)\b/gi) || []).length * 3,
    
    // Enforcement mechanisms
    enforcement: (content.match(/\b(?:enforce|penalty|sanction|compliance|violation)\b/gi) || []).length * 4
  };

  const totalScore = Object.values(implementationFactors).reduce((sum, score) => sum + score, 0);
  return Math.min(100, totalScore);
};

const extractImplementationMetricsFromContent = (content: string): string[] => {
  const metrics = [];

  // Extract specific metrics
  const quantitative = content.match(/\b\d+(?:\.\d+)?%\s+(?:compliance|implementation|adoption|success)\b[^.]+\./gi) || [];
  metrics.push(...quantitative);

  // Extract timeline metrics
  const timelines = content.match(/\b(?:within|by)\s+\d+\s+(?:days|months|years)[^.]+\./gi) || [];
  metrics.push(...timelines);

  // Extract progress indicators
  const progress = content.match(/\b(?:progress|milestone|achievement|completion)[^.]+\d+[^.]+\./gi) || [];
  metrics.push(...progress);

  return [...new Set(metrics)];
};

// Calculate weighted influence score based on industry factors and content analysis
const calculateIndustryFactors = (content: string) => {
  return {
    // Measure industry-specific terminology frequency
    industryTerms: (content.match(/\b(?:market|industry|sector|business|company|corporate)\b/gi) || []).length,
    
    // Measure economic impact references
    economicImpact: (content.match(/\b(?:revenue|cost|profit|financial|economic|budget)\b/gi) || []).length,
    
    // Measure stakeholder mentions
    stakeholders: (content.match(/\b(?:stakeholder|shareholder|investor|employee|customer|client)\b/gi) || []).length,
    
    // Measure regulatory references
    regulation: (content.match(/\b(?:regulation|compliance|requirement|law|policy|standard)\b/gi) || []).length,
    
    // Measure market effect indicators
    marketEffect: (content.match(/\b(?:market share|competition|demand|supply|growth|trend)\b/gi) || []).length
  };
};
const content = document.content || '';

const industryFactors = calculateIndustryFactors(content);

// Calculate impact score based on implementation confidence
const impactScore = getImplementationConfidence(content);

const influenceScore = Math.min(10, Math.round(
  ((industryFactors.industryTerms * 0.4) +
  (industryFactors.economicImpact * 0.3) +
  (industryFactors.stakeholders * 0.2) +
  (industryFactors.regulation * 0.3) +
  (industryFactors.marketEffect * 0.3) +
  (impactScore * 0.05)) * 10) / 10
);

const calculatePrecedentialWeight = (citationCount: number, impactScore: number, content: string): string => {
  const weights = {
    citations: Math.min(50, citationCount) / 50, // Normalize to 0-1
    impact: impactScore / 100, // Normalize to 0-1
  };

  // Calculate combined weight
  const combinedWeight = (weights.citations * 0.6) + (weights.impact * 0.4);

  // Determine precedential weight category
  if (combinedWeight >= 0.8) {
    return "Very High";
  } else if (combinedWeight >= 0.6) {
    return "High";
  } else if (combinedWeight >=0.4) {
    return "Moderate";
  } else if (combinedWeight >=0.2) {
    return "Limited";
  } else {
    return "Low";
  }
};

const extractSupportingEvidence = (description: string, content: string): string[] => {
  // Extract citations and references
  const citations = content.match(/\b\d+\s+[A-Z][a-z]+\s+\d+\b/g) || [];
  const caseRefs = content.match(/\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b/g) || [];
  
  // Extract quoted evidence
  const quotes = description.match(/"([^"]*?)"/g) || [];
  
  // Extract specific references
  const references = description.match(/\b(?:see|cf\.|compare|e\.g\.,)[^.]+\./gi) || [];
  
  return [...new Set([...citations, ...caseRefs, ...quotes, ...references])];
};

const extractLegalFactors = (content: string): string[] => {
  const factors = [];
  
  // Key legal principles
  const principles = content.match(/\b(?:doctrine of|principle of|rule of|test for)[^.]+\./gi) || [];
  factors.push(...principles);

  // Statutory references
  const statutes = content.match(/\b\d+\s+U\.S\.C\.\s+§\s+\d+\b/g) || [];
  factors.push(...statutes);

  // Constitutional provisions
  const constitutional = content.match(/\b(?:Article|Amendment|Section)\s+[IVX\d]+\b/g) || [];
  factors.push(...constitutional);

  // Precedential cases
  const cases = content.match(/\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b/g) || [];
  factors.push(...cases);

  return [...new Set(factors)].slice(0, 5); // Return top 5 unique factors
};

const extractApplications = (principle: string, content: string): string[] => {
  const applications = [];
  
  // Find direct applications
  const directRefs = content.match(new RegExp(`\\b${principle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]+applies\\b[^.]+\\.`, 'gi')) || [];
  applications.push(...directRefs);

  // Find examples
  const examples = content.match(new RegExp(`\\bfor example[^.]*?${principle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]+\\.`, 'gi')) || [];
  applications.push(...examples);

  // Find case applications
  const caseApps = content.match(/\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b[^.]*?applied[^.]+\./gi) || [];
  applications.push(...caseApps);

  return [...new Set(applications)].slice(0, 3);
};

const extractPrecedents = (principle: string, content: string): string[] => {
  const precedents = [];
  
  // Find case citations
  const cases = content.match(/\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b/g) || [];
  precedents.push(...cases);

  // Find statutory precedents
  const statutes = content.match(/\b\d+\s+U\.S\.C\.\s+§\s+\d+\b/g) || [];
  precedents.push(...statutes);

  // Find regulatory precedents
  const regulations = content.match(/\b\d+\s+C\.F\.R\.\s+§\s+\d+\b/g) || [];
  precedents.push(...regulations);

  return [...new Set(precedents)].slice(0, 5);
};

const determinePrincipleStrength = (principle: string, content: string): 'strong' | 'moderate' | 'emerging' => {
  let score = 0;
  
  // Check citations
  const citations = content.match(new RegExp(`\\b${principle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*?\\b\\d+\\s+[A-Z][a-z]+\\s+\\d+\\b`, 'gi')) || [];
  score += citations.length * 2;

  // Check affirmative language
  const affirmative = content.match(new RegExp(`\\b(?:well-established|settled|fundamental|essential)\\b[^.]*?${principle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi')) || [];
  score += affirmative.length * 3;

  // Check application frequency
  const applications = content.match(new RegExp(`\\b${principle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')) || [];
  score += applications.length;

  if (score >= 10) return 'strong';
  if (score >= 5) return 'moderate';
  return 'emerging';
};



  // Update the metrics and analysis sections
  const ContentDisplay = useCallback(() => {
    const calculatedMetrics = useMemo(() => calculateMetrics(document, enhancedContent ?? undefined), [document, enhancedContent]);
    
    return (
      <div className="space-y-12">
        {/* Metrics Grid with enhanced styling */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Impact Score", value: calculatedMetrics.impactScore },
            { label: "Citation Count", value: calculatedMetrics.citationCount },
            { label: "Precedential Weight", value: calculatedMetrics.precedentialWeight },
            { label: "Implementation Rate", value: calculatedMetrics.implementationRate },
            { label: "Industry Influence", value: calculatedMetrics.industryInfluence },
            { label: "Complexity Score", value: calculatedMetrics.complexityScore },
            { label: "Jurisdictional Reach", value: calculatedMetrics.jurisdictionalReach },
            { label: "Academic Citations", value: calculatedMetrics.academicCitations },
            { label: "Practice Area Impact", value: calculatedMetrics.practiceAreaImpact },
            { label: "Future Relevance", value: calculatedMetrics.futureRelevanceScore }
          ].map((metric, i) => (
            <div key={i} className="relative bg-white dark:bg-gray-800 hover:shadow-2xl rounded-xl transition-all duration-300 overflow-hidden group">
              <div className="group-hover:from-indigo-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 transition-all duration-300" />
              <div className="relative p-6">
                <h3 className="font-medium text-gray-500 text-sm dark:text-gray-400">{metric.label}</h3>
                <p className="bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mt-2 font-bold text-2xl text-transparent">
                  {metric.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced content sections */}
        <MarkdownBox 
          title="Comprehensive Analysis" 
          content={processMarkdown(enhancedContent?.enhancedContent ?? 'Analyzing...')}
          gradient="from-blue-600 to-indigo-600"
        />
        
        <MarkdownBox 
          title="Key Insights & Metrics" 
          content={enhancedContent?.keyInsights ? formatInsights(enhancedContent.keyInsights) : 'Processing insights...'}
          gradient="from-indigo-600 to-violet-600"
        />

        <MarkdownBox 
          title="Related Topics & Trends" 
          content={enhancedContent?.relatedTopics ? formatTopics(enhancedContent.relatedTopics) : 'Analyzing topics...'}
          gradient="from-violet-600 to-purple-600"
        />

        <MarkdownBox 
          title="Impact Analysis" 
          content={enhancedContent?.analysis ? formatAnalysis(enhancedContent.analysis) : 'Preparing analysis...'}
          gradient="from-purple-600 to-pink-600"
        />
      </div>
    );
  }, [document, enhancedContent]);

  // Helper functions for parsing Gemini response
  const parseKeyInsights = useCallback((text: string): KeyInsight[] => {
    const insightsSection = text.split('KEY INSIGHTS:')[1]?.split('RELATED LEGAL TOPICS:')[0] || '';
    const insights = insightsSection.split(/\d+\./).filter(Boolean);
    
    return insights.map(insight => {
      const lines = insight.split('\n').filter(Boolean);
      const description = lines.find(l => l.includes('Description:'))?.replace(/Description:\s*/, '').trim();
      const impact = lines.find(l => l.includes('Impact:'))?.replace(/Impact:\s*/, '').trim();
      const precedents = lines.find(l => l.includes('Precedents:'))?.replace(/Precedents:\s*/, '').trim();
      const future = lines.find(l => l.includes('Future:'))?.replace(/Future:\s*/, '').trim();

      // Add validation and fallback logic
      if (!description || !impact || !precedents || !future) {
        console.warn('Missing required insight fields, regenerating content...');
        throw new Error('Invalid insight format');
      }

      return {
        title: lines[0]?.trim() || 'Key Insight',
        description,
        impact,
        precedents,
        future
      };
    });
  }, []);

  const parseRelatedTopics = useCallback((text: string): RelatedTopic[] => {
    const topicsSection = text.split('RELATED LEGAL TOPICS:')[1]?.split('LEGAL ANALYSIS:')[0] || '';
    const topics = topicsSection.split(/\d+\./).filter(Boolean);
    
    return topics.map(topic => {
      const lines = topic.split('\n').filter(Boolean);
      const relevance = lines.find(l => l.includes('Relevance:'))?.replace(/Relevance:\s*/, '').trim();
      const cases = lines.find(l => l.includes('Key Cases:'))?.replace(/Key Cases:\s*/, '').split(',').map(c => c.trim());
      const history = lines.find(l => l.includes('Historical Context:'))?.replace(/Historical Context:\s*/, '').trim();
      const trends = lines.find(l => l.includes('Current Trends:'))?.replace(/Current Trends:\s*/, '').trim();

      // Validate required fields
      if (!relevance || !cases || cases.length < 3 || !history || !trends) {
        throw new Error('Invalid topic format');
      }

      return {
        name: lines[0]?.trim() || 'Related Topic',
        relevance,
        caseRefs: cases,
        history,
        trends
      };
    });
  }, []);

  const parseAnalysis = useCallback((text: string): Analysis => {
    const analysisSection = text.split('LEGAL ANALYSIS:')[1] || '';
    const sections = analysisSection.split(/(?:Overview:|Precedential Value:|Future Implications:|Key Challenges:)/g).filter(Boolean);
    
    return {
      overview: sections[0]?.trim() || '',
      precedentialValue: sections[1]?.trim() || '',
      implications: sections[2]?.trim() || '',
      challenges: sections[3]?.split('-').filter(Boolean).map(c => c.trim()) || []
    };
  }, []);

  // Optimized Gemini processing
  const enhanceContentWithGemini = useCallback(async (content: string) => {
    if (!content || isProcessing) return;

    const cachedResult = geminiCache.get(contentHash);
    if (cachedResult) {
      setEnhancedContent(cachedResult);
      return;
    }

    try {
      setIsProcessing(true);
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 30720,
          candidateCount: 1,
          stopSequences: [],
        }
      });

      // Fix: Create proper GenerateContentRequest object
      const prompt = {
        contents: [{
          parts: [{
            text: `Analyze this document comprehensively and generate an extensive analysis (MINIMUM 6000 words).
            Use specific examples, citations, and detailed analysis throughout.
            
            Document Content:
            ${content}
            
            Required Sections (each section must meet minimum word counts):
            
            1. COMPREHENSIVE OVERVIEW (3500+ words):
            - Detailed background and context
            - Complete chronological analysis
            - Core principles and precedents
            - All key arguments and counterarguments
            - Detailed reasoning and justification
            - Practical implications
            - Industry impact assessment
            - Future considerations
            
            2. KEY INSIGHTS (5 points, 400+ words each):
            For each insight:
            - Specific finding or principle
            - Detailed analysis with citations
            - Impact metrics with data
            - Implementation examples
            - Industry effect analysis
            - Related references
            - Future implications timeline
            
            3. RELATED TOPICS (3 areas, 500+ words each):
            For each topic:
            - Domain analysis
            - Relevance metrics
            - Minimum 7 related cases
            - Historical development
            - Current applications
            - Future predictions
            
            4. IMPACT ANALYSIS (1500+ words):
            - Comprehensive metrics
            - Implementation data
            - Industry response analysis
            - Market impact assessment
            - Regulatory implications
            - Future outlook
            
            IMPORTANT: 
            - Maintain academic rigor throughout
            - Include specific citations and references
            - Use concrete examples and data
            - Provide detailed analysis for each point
            - Ensure minimum word counts are met`
          }]
        }]
      };

      const formattedPrompt: GenerateContentRequest = {
        contents: [{
          role: 'user', 
          parts: [{
            text: prompt.contents[0].parts[0].text
          }]
        }]
      };

      const result = await model.generateContent(formattedPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Validate and process the response
      if (!text || text.length < 5000) {
        throw new Error("Generated content too short - regenerating");
      }

      const enhanced = parseGeminiResponse(text);
      geminiCache.set(contentHash, enhanced);
      setEnhancedContent(enhanced);

    } catch (error) {
      console.error('Error:', error as Error);
      if ((error as Error).message === "Generated content too short - regenerating") {
        // Add delay before retry to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        await enhanceContentWithGemini(content);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [contentHash, isProcessing]);

  // Optimize parsing function 
  const parseGeminiResponse = useCallback((text: string): EnhancedContent => {
    return {
      enhancedContent: text,
      summary: text.split('KEY INSIGHTS:')[0].replace('EXECUTIVE SUMMARY:', '').trim(),
      keyInsights: parseKeyInsights(text),
      relatedTopics: parseRelatedTopics(text),
      analysis: parseAnalysis(text)
    };
  }, [parseKeyInsights, parseRelatedTopics, parseAnalysis]);

  // Pre-load content
  useEffect(() => {
    if (document.metadata.pageContent) {
      // Start processing immediately in background
      const timer = setTimeout(() => {
        enhanceContentWithGemini(document.metadata.pageContent);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [document.metadata.pageContent]);

  const formatLegalText = (text: string) => {
    // Add citation formatting
    text = text.replace(/\b(\d+)\s+([A-Z][a-z]+\s+\d+)\b/g, 
      '<span class="font-semibold text-indigo-600 dark:text-indigo-400">$1 $2</span>');
    
    // Add case name formatting
    text = text.replace(/\b([A-Z][a-z]+)\s+v\.\s+([A-Z][a-z]+)\b/g,
      '<span class="text-gray-800 dark:text-gray-200 italic">$1 v. $2</span>');
    
    // Add statute formatting
    text = text.replace(/\b(\d+)\s+U\.S\.C\.\s+§\s+(\d+)\b/g,
      '<span class="bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono text-sm">$1 U.S.C. § $2</span>');
    
    return text;
  };

  // Add this effect to process the content immediately
  useEffect(() => {
    if (document.content && !quickOverview) {
      // Generate a quick overview immediately while waiting for Gemini
      setQuickOverview(document.content.substring(0, 500) + '...');
    }
  }, [document.content]);

  // Add this function to process markdown content
  const processMarkdown = useCallback((content: string) => {
    // Remove markdown bold/italic markers but keep the text
    return content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1');
  }, []);

  // Add this new component for enhanced data display
  const EnhancedDataSection = ({ document, enhancedContent }: { 
    document: DocumentViewProps['document'],
    enhancedContent?: EnhancedContent 
  }) => {
    const [relatedDocs, setRelatedDocs] = useState<any[]>([]);
    
    useEffect(() => {
      const fetchRelatedDocuments = async () => {
        const response = await fetch(`/api/related-documents?topic=${document.metadata.topic}`);
        const data = await response.json();
        setRelatedDocs(data.documents);
      };
      
      fetchRelatedDocuments();
    }, [document.metadata.topic]);
    return (
      <div className="space-y-8">
        {/* Gemini Enhanced Content */}
        <div className="bg-white dark:bg-gray-800 shadow-lg p-6 rounded-xl">
          <h2 className="bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4 font-bold text-2xl text-transparent">
          Analysis
          </h2>
          <div className="max-w-none dark:prose-invert prose">
            {enhancedContent ? (
              <ReactMarkdown components={{
                code: ({ className, children, ...props }) => (
                  <code className={`${className} relative font-mono text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700/50 shadow-lg backdrop-blur-sm hover:scale-[1.02] transition-all duration-200`} {...props}>
                    {children}
                  </code>
                ),
                p: ({children}) => (
                  <p className="relative z-10 backdrop-blur-sm mb-4 text-gray-900/90 hover:text-blue-800 leading-relaxed transition-colors duration-200">
                    {children}
                  </p>
                ),
                h3: ({children}) => (
                  <h3 className="bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-3 font-bold text-transparent text-xl">
                    {children}
                  </h3>
                ),
                ul: ({children}) => (
                  <ul className="space-y-2 my-4 ml-4">
                    {children}
                  </ul>
                ),
                li: ({children}) => (
                  <li className="flex items-center gap-2 text-gray-900/80 hover:text-blue-800 transition-colors duration-200">
                    <div className="bg-purple-400 rounded-full w-1.5 h-1.5"></div>
                    {children}
                  </li>
                )
              }}>
                {enhancedContent.enhancedContent}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center gap-3 py-8 text-lg animate-pulse">
                <div className="bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full w-6 h-6 animate-spin"></div>
                Loading analysis...
              </div>
            )}
          </div>
        </div>

        {/* Related Documents */}
        {/* Related Documents */}
        <div className="bg-white dark:bg-gray-800 shadow-lg p-6 rounded-xl">
          <h2 className="bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4 font-bold text-2xl text-transparent">
            Related Cases & Documents
          </h2>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            {relatedDocs.map((doc, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="mb-2 font-semibold text-lg">{doc.title}</h3>
                <p className="text-gray-600 text-sm dark:text-gray-300">{doc.outcome}</p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">
                    {doc.date}
                  </span>
                  <span className="bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded text-xs">
                    {doc.topic}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Timeline */}
        <div className="bg-white dark:bg-gray-800 shadow-lg p-6 rounded-xl">
          <h2 className="bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 mb-4 font-bold text-2xl text-transparent">
            Historical Context & Timeline
          </h2>
          <div className="relative">
            <div className="left-4 absolute bg-gradient-to-b from-blue-500 to-purple-500 w-0.5 h-full"></div>
            {enhancedContent?.relatedTopics.map((topic, index) => (
              <div key={index} className="relative mb-6 ml-10">
                <div className="-left-6 absolute bg-purple-500 rounded-full w-3 h-3"></div>
                <h3 className="mb-2 font-semibold">{topic.name}</h3>
                <p className="text-gray-600 text-sm dark:text-gray-300">{topic.history}</p>
                <div className="mt-2">
                  {topic.caseRefs.map((ref, i) => (
                    <span key={i} className="inline-block bg-gray-100 dark:bg-gray-700 mr-2 mb-2 px-2 py-1 rounded text-xs">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights Grid */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
          {enhancedContent?.keyInsights.map((insight, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 shadow-lg p-6 rounded-xl">
              <h3 className="mb-3 font-semibold text-lg">{insight.title}</h3>
              <p className="mb-4 text-gray-600 dark:text-gray-300">{insight.description}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Impact:</span>
                  <span className="text-gray-600 text-sm dark:text-gray-300">{insight.impact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Future Implications:</span>
                  <span className="text-gray-600 text-sm dark:text-gray-300">{insight.future}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  // Add this useEffect to calculate metrics when document changes
  useEffect(() => {
    if (document) {
      // Convert null to undefined to match expected type
      const enhancedContentParam = enhancedContent ?? undefined;
      const calculatedMetrics = calculateMetrics(document, enhancedContentParam);
      setMetrics(calculatedMetrics);
    }
  }, [document, enhancedContent]);

  // Add this effect to calculate summary metrics 
  useEffect(() => {
    const fetchAndCalculateMetrics = async () => {
      if (!document || isLoadingMetrics) return;
      
      setIsLoadingMetrics(true);
      try {
        // Calculate basic metrics
        const baseMetrics = calculateMetrics(document, enhancedContent ?? undefined);
        
        // Generate enhanced analysis with Gemini
        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Analyze this legal document and provide detailed metrics:
          ${document.content}
          
          Required Analysis:
          1. Key Points (minimum 5) with confidence scores and supporting evidence
          2. Legal Principles with applications and precedents
          3. Impact Analysis:
             - Societal Impact (score, areas, trends)
             - Legal Significance (score, key factors)
             - Industry Effect (sectors, implications)
             - Timeline Relevance (score, factors, current impact)
             - Implementation Timeline (phases, milestones, deadlines)
          4. Quick Statistics with trends and confidence scores`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let generatedMetrics;
        
        try {
          generatedMetrics = JSON.parse(response.text());
        } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError);
          generatedMetrics = DEFAULT_METRICS;
        }

        // Ensure all required properties exist
        const sanitizedMetrics = {
          ...DEFAULT_METRICS,
          ...generatedMetrics,
          impactMetrics: {
            ...DEFAULT_METRICS.impactMetrics,
            ...(generatedMetrics.impactMetrics || {}),
            legalSignificance: {
              ...DEFAULT_METRICS.impactMetrics.legalSignificance,
              ...(generatedMetrics.impactMetrics?.legalSignificance || {})
            },
            societalImpact: {
              ...DEFAULT_METRICS.impactMetrics.societalImpact,
              ...(generatedMetrics.impactMetrics?.societalImpact || {})
            },
            industryEffect: {
              ...DEFAULT_METRICS.impactMetrics.industryEffect,
              ...(generatedMetrics.impactMetrics?.industryEffect || {})
            },
            timelineRelevance: {
              ...DEFAULT_METRICS.impactMetrics.timelineRelevance,
              ...(generatedMetrics.impactMetrics?.timelineRelevance || {})
            }
          },
          baseMetrics
        };

        setSummaryMetrics(sanitizedMetrics);
      } catch (error) {
        console.error('Error calculating metrics:', error);
       // setSummaryMetrics(DEFAULT_METRICS);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchAndCalculateMetrics();
  }, [document]);

  return (
    <div className="relative flex flex-col bg-white dark:bg-gray-900 min-h-screen">
      {/* Header Section */}
      <div className="top-0 z-50 sticky border-gray-200/20 dark:border-gray-700/20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b">
        <div className="mx-auto px-6 py-4 max-w-7xl">
          {/* Back Button */}
          <button 
            onClick={onBack}
            className="relative flex items-center space-x-2 hover:shadow-lg hover:shadow-indigo-500/20 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span>
            <span className="bg-clip-text bg-gradient-to-r from-indigo-500 to-pink-500 text-transparent">
              Back to search
            </span>
          </button>

          {/* Title */}
          <h1 className="mt-6 font-black text-4xl tracking-tight">
            <span className="bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-transparent animate-gradient-x">
              {document.metadata.title}
            </span>
          </h1>

          {/* Metadata Grid */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-4 mt-8">
            {[
              { label: "Topic", value: document.metadata.topic },
              { label: "Outcome", value: document.metadata.outcome },
              { label: "Date", value: new Date(document.metadata.date).toLocaleDateString() },
              { label: "Length", value: `${document.metadata.contentLength?.toLocaleString() || 0} characters` }
            ].map((item, i) => (
              <div key={i} className="relative hover:shadow-xl rounded-2xl transition-all hover:-translate-y-1 duration-300 group">
                <div className="group-hover:from-indigo-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 transition-all duration-300" />
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6">
                  <span className="font-semibold text-gray-500 text-xs dark:text-gray-400 uppercase tracking-wider">
                    {item.label}
                  </span>
                  <p className="bg-clip-text bg-gradient-to-r from-gray-900 dark:from-gray-100 to-gray-700 dark:to-gray-300 mt-2 font-medium text-transparent">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* View Controls */}
          <div className="flex justify-between items-center mt-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('full')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'full' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Full Content
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'summary' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Summary
              </button>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              {isExpanded ? 'Collapse' : 'Expand All'}
            </button>
          </div>
        </div>
      </div>

      {/* Add Metrics Dashboard right after header */}
      {metrics && (
        <div className="mx-auto px-6 w-full max-w-7xl">
          <div className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 mt-8 p-1 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <div className="relative gap-4 grid grid-cols-2 md:grid-cols-4 p-6">
              {[
                { 
                  label: "Impact Score", 
                  value: metrics.impactScore,
                  icon: "⚡",
                  gradient: "from-blue-500 to-cyan-300"
                },
                { 
                  label: "Implementation Rate", 
                  value: metrics.implementationRate,
                  icon: "🎯",
                  gradient: "from-purple-500 to-pink-300"
                },
                { 
                  label: "Complexity Score", 
                  value: metrics.complexityScore,
                  icon: "🧩",
                  gradient: "from-emerald-500 to-teal-300"
                },
                { 
                  label: "Industry Influence", 
                  value: metrics.industryInfluence,
                  icon: "🏢",
                  gradient: "from-orange-500 to-amber-300"
                }
              ].map((metric, i) => (
                <div key={i} className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r ${metric.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur`} />
                  <div className="relative bg-black/20 backdrop-blur-xl p-4 rounded-xl hover:scale-105 transition-transform">
                    <div className="mb-2 text-2xl">{metric.icon}</div>
                    <div className="text-sm text-white/60">{metric.label}</div>
                    <div className={`text-2xl font-bold bg-gradient-to-r ${metric.gradient} bg-clip-text text-transparent`}>
                      {metric.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2 mt-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 blur rounded-xl transition-opacity duration-300" />
              <div className="relative bg-black/20 backdrop-blur-xl p-6 rounded-xl">
                <h3 className="font-bold text-white text-xl">Legal Impact Analysis</h3>
                <div className="space-y-2 mt-4">
                  <div className="text-white/80">Precedential Weight: {metrics.precedentialWeight}</div>
                  <div className="text-white/80">Jurisdictional Reach: {metrics.jurisdictionalReach}</div>
                  <div className="text-white/80">Academic Citations: {metrics.academicCitations}</div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-400 opacity-0 group-hover:opacity-100 blur rounded-xl transition-opacity duration-300" />
              <div className="relative bg-black/20 backdrop-blur-xl p-6 rounded-xl">
                <h3 className="font-bold text-white text-xl">Practice Impact</h3>
                <div className="space-y-2 mt-4">
                  <div className="text-white/80">Practice Area: {metrics.practiceAreaImpact}</div>
                  <div className="text-white/80">Future Relevance: {metrics.futureRelevanceScore}</div>
                  <div className="text-white/80">Citation Count: {metrics.citationCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div ref={contentRef} className="relative z-10 flex-1 mx-auto mt-8 px-6 w-full max-w-7xl">
        <div className="space-y-12">
          {/* Existing metrics grid */}
          
          {/* Add the new enhanced data section */}
          <EnhancedDataSection document={document} enhancedContent={enhancedContent || undefined} />
          
          {/* Document content with enhanced styling */}
          <div className="bg-white dark:bg-gray-800 shadow-lg p-6 rounded-xl">
            <h2 className="bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4 font-bold text-2xl text-transparent">
              Document Content
            </h2>
            <div className="max-w-none dark:prose-invert prose">
              {formatContent(document.content)}
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="mx-auto px-6 py-4 w-full max-w-7xl">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('full')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'full' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Full Content
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'summary' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Summary
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="mx-auto px-6 w-full max-w-7xl">
        {activeTab === 'summary' ? (
          <SummaryView 
            document={document}
            enhancedContent={enhancedContent || undefined}
          />
        ) : (
          <div className="space-y-8">
            {/* Original metrics and content */}
            <EnhancedGeminiContent 
              content={document.content}
              metrics={summaryMetrics || {}}
              enhancedContent={enhancedContent || undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Define missing calculation functions
const calculateComplexityScore = (content: string): number => {
  const factors = {
    legalTerms: (content.match(/\b(?:pursuant|whereas|hereinafter|aforementioned|notwithstanding)\b/gi) || []).length,
    longSentences: content.split(/[.!?]+/).filter(sentence => sentence.split(' ').length > 30).length,
    citations: (content.match(/\b\d+\s+[A-Z][a-z]+\s+\d+\b|\b[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+\b/g) || []).length,
    sections: (content.match(/\b(?:Section|Article|Paragraph)\s+\d+/gi) || []).length,
    subclauses: (content.match(/\([a-z]\)|\([0-9]\)|\([iv]+\)/gi) || []).length
  };

  return Math.min(100, Math.round(
    (factors.legalTerms * 2) +
    (factors.longSentences * 3) +
    (factors.citations * 2) +
    (factors.sections * 1.5) +
    (factors.subclauses * 1.5)
  ));
};

const calculateImplementationRate = (content: string): number => {
  const implementationFactors = {
    directImplementation: (content.match(/\b(?:implemented|enacted|established|instituted|adopted)\b/gi) || []).length,
    compliance: (content.match(/\b(?:comply|conformity|accordance|adherence|compliance)\b/gi) || []).length,
    enforcement: (content.match(/\b(?:enforce|mandate|require|compel|obligate)\b/gi) || []).length,
    timeline: (content.match(/\b(?:effective|commence|begin|start|initiate)\s+(?:on|from|after|by)\b/gi) || []).length,
    success: (content.match(/\b(?:successful|achieved|completed|fulfilled|satisfied)\b/gi) || []).length
  };

  return Math.min(100, Math.round(
    (implementationFactors.directImplementation * 4) +
    (implementationFactors.compliance * 3) +
    (implementationFactors.enforcement * 3) +
    (implementationFactors.timeline * 2) +
    (implementationFactors.success * 3)
  ));
};

const calculateIndustryInfluence = (content: string, impactScore: number): string => {
  const industryFactors = {
    industryTerms: (content.match(/\b(?:industry|sector|market|business|commercial|trade)\b/gi) || []).length,
    economicImpact: (content.match(/\b(?:economic|financial|monetary|fiscal|revenue|cost)\b/gi) || []).length,
    stakeholders: (content.match(/\b(?:stakeholder|participant|entity|corporation|company|firm)\b/gi) || []).length,
    regulation: (content.match(/\b(?:regulate|oversight|compliance|standard|requirement)\b/gi) || []).length,
    marketEffect: (content.match(/\b(?:market|competition|competitive|supply|demand)\b/gi) || []).length
  };

  const influenceScore = Math.min(10, Math.round(
    ((industryFactors.industryTerms * 0.4) +
    (industryFactors.economicImpact * 0.3) +
    (industryFactors.stakeholders * 0.2) +
    (industryFactors.regulation * 0.3) +
    (industryFactors.marketEffect * 0.3) +
    (impactScore * 0.05)) * 10) / 10
  );

  return `${influenceScore.toFixed(1)}/10`;
};

const EnhancedGeminiContent = ({ content, metrics, enhancedContent }: { 
  content: string, 
  metrics: any,
  enhancedContent?: EnhancedContent 
}) => {
  return (
    <div className="space-y-8">
      {/* Hero Metrics Dashboard */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-1 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative gap-4 grid grid-cols-2 md:grid-cols-4 p-6">
          {[
            { 
              label: "Impact Score", 
              value: metrics.impactScore,
              icon: "⚡",
              gradient: "from-blue-500 to-cyan-300"
            },
            { 
              label: "Implementation Rate", 
              value: `${metrics.implementationRate}%`,
              icon: "🎯",
              gradient: "from-purple-500 to-pink-300"
            },
            { 
              label: "Complexity Score", 
              value: metrics.complexityScore,
              icon: "🧩",
              gradient: "from-emerald-500 to-teal-300"
            },
            { 
              label: "Industry Influence", 
              value: metrics.industryInfluence,
              icon: "🏢",
              gradient: "from-orange-500 to-amber-300"
            }
          ].map((metric, i) => (
            <div key={i} className="relative group">
              <div className={`absolute inset-0 bg-gradient-to-r ${metric.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur`} />
              <div className="relative bg-black/20 backdrop-blur-xl p-4 rounded-xl hover:scale-105 transition-transform">
                <div className="mb-2 text-2xl">{metric.icon}</div>
                <div className="text-sm text-white/60">{metric.label}</div>
                <div className={`text-2xl font-bold bg-gradient-to-r ${metric.gradient} bg-clip-text text-transparent`}>
                  {metric.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis Cards */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 blur rounded-xl transition-opacity duration-300" />
          <div className="relative bg-black/20 backdrop-blur-xl p-6 rounded-xl hover:scale-105 transition-transform">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">⚖️</div>
              <h3 className="font-bold text-white text-xl">Legal Impact Analysis</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-white/60">Score</div>
                <div className="bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 font-bold text-2xl text-transparent">
                  {safeMetricAccess(metrics, 'impactMetrics.legalSignificance.score', 0)}/10
                </div>
              </div>
              <div>
                <div className="text-sm text-white/60">Key Factors</div>
                <ul className="text-white/80 list-disc list-inside">
                  {safeMetricAccess(metrics, 'impactMetrics.legalSignificance.keyFactors', []).map((factor: string, i: number) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-400 opacity-0 group-hover:opacity-100 blur rounded-xl transition-opacity duration-300" />
          <div className="relative bg-black/20 backdrop-blur-xl p-6 rounded-xl hover:scale-105 transition-transform">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">🌍</div>
              <h3 className="font-bold text-white text-xl">Societal Impact</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-white/60">Score</div>
                <div className="bg-clip-text bg-gradient-to-r from-purple-600 to-pink-400 font-bold text-2xl text-transparent">
                  {safeMetricAccess(metrics, 'impactMetrics.societalImpact.score', 0)}/10
                </div>
              </div>
              <div>
                <div className="text-sm text-white/60">Impact Areas</div>
                <ul className="text-white/80 list-disc list-inside">
                  {safeMetricAccess(metrics, 'impactMetrics.societalImpact.areas', []).map((area: string, i: number) => (
                    <li key={i}>{area}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline & Trends */}
      <div className="relative bg-gradient-to-br from-gray-900 to-black p-1 rounded-2xl overflow-hidden">
        <div className="relative bg-black/40 backdrop-blur-xl p-6 rounded-xl">
          <h3 className="mb-4 font-bold text-white text-xl">Timeline Relevance</h3>
          <div className="space-y-4">
            {safeMetricAccess(metrics, 'impactMetrics.timelineRelevance.factors', []).map((factor: string, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="bg-purple-500 rounded-full w-2 h-2" />
                <div className="flex-1">
                  <div className="text-white/90">{factor}</div>
                  <div className="bg-gray-700 mt-2 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-full" 
                      style={{ width: `${safeMetricAccess(metrics, 'impactMetrics.timelineRelevance.currentScore', 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Content Display */}
      <div className="max-w-none dark:prose-invert prose prose-lg">
        <ReactMarkdown 
          className="relative bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl"
          components={{
            h1: ({ children }) => (
              <h1 className="bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-6 font-bold text-4xl text-transparent">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mt-8 mb-4 font-semibold text-2xl text-transparent">
                {children}
              </h2>
            ),
            p: ({ children }) => (
              <p className="mb-4 text-gray-300 leading-relaxed">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="space-y-2 my-4">{children}</ul>
            ),
            li: ({ children }) => (
              <li className="flex items-center gap-2">
                <span className="bg-purple-500 rounded-full w-1.5 h-1.5" />
                <span className="text-gray-300">{children}</span>
              </li>
            )
          }}
        >
          {enhancedContent?.enhancedContent || ''}
        </ReactMarkdown>
      </div>
    </div>
  );
};

// Add safe access helper
const safeMetricAccess = (metrics: any, path: string, defaultValue: any = 0) => {
  return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : defaultValue), metrics);
};

interface MetricsDisplayProps {
  metrics: Partial<SummaryMetrics>;
  isLoading?: boolean;
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ metrics, isLoading }) => {
  if (isLoading) {
    return <div>Loading metrics...</div>;
  }

  return (
    <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 p-6">
      {/* Societal Impact */}
      <div className="bg-white dark:bg-gray-800 shadow p-4 rounded-lg">
        <h3 className="mb-2 font-semibold text-lg">Societal Impact</h3>
        <div className="space-y-2">
          <p>Score: {safeMetricAccess(metrics, 'impactMetrics.societalImpact.score')}</p>
          <p>Trend: {safeMetricAccess(metrics, 'impactMetrics.societalImpact.trend', 'stable')}</p>
          <div>
            <p className="font-medium">Key Areas:</p>
            <ul className="pl-4 list-disc">
              {safeMetricAccess(metrics, 'impactMetrics.societalImpact.areas', []).map((area: string, i: number) => (
                <li key={i}>{area}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Legal Significance */}
      <div className="bg-white dark:bg-gray-800 shadow p-4 rounded-lg">
        <h3 className="mb-2 font-semibold text-lg">Legal Significance</h3>
        <div className="space-y-2">
          <p>Score: {safeMetricAccess(metrics, 'impactMetrics.legalSignificance.score')}</p>
          <p>Scope: {safeMetricAccess(metrics, 'impactMetrics.legalSignificance.jurisdictionalScope', 'N/A')}</p>
          <div>
            <p className="font-medium">Key Factors:</p>
            <ul className="pl-4 list-disc">
              {safeMetricAccess(metrics, 'impactMetrics.legalSignificance.keyFactors', []).map((factor: string, i: number) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Industry Effect */}
      <div className="bg-white dark:bg-gray-800 shadow p-4 rounded-lg">
        <h3 className="mb-2 font-semibold text-lg">Industry Effect</h3>
        <div className="space-y-2">
          <p>Score: {safeMetricAccess(metrics, 'impactMetrics.industryEffect.score', '0')}</p>
          <p>Timeframe: {safeMetricAccess(metrics, 'impactMetrics.industryEffect.timeframe', 'short-term')}</p>
          <div>
            <p className="font-medium">Affected Sectors:</p>
            <ul className="pl-4 list-disc">
              {safeMetricAccess(metrics, 'impactMetrics.industryEffect.sectors', []).map((sector: string, i: number) => (
                <li key={i}>{sector}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Timeline Relevance */}
      <div className="bg-white dark:bg-gray-800 shadow p-4 rounded-lg">
        <h3 className="mb-2 font-semibold text-lg">Timeline Relevance</h3>
        <div className="space-y-2">
          <p>Current Score: {safeMetricAccess(metrics, 'impactMetrics.timelineRelevance.currentScore')}</p>
          <p>Projected Score: {safeMetricAccess(metrics, 'impactMetrics.timelineRelevance.projectedScore')}</p>
          <div>
            <p className="font-medium">Key Factors:</p>
            <ul className="pl-4 list-disc">
              {safeMetricAccess(metrics, 'impactMetrics.timelineRelevance.factors', []).map((factor: string, i: number) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};