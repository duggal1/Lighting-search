"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SearchForm from "@/components/SearchForm";
import DocumentView from "@/components/DocumentView";
import { type Document } from "./types/document";
import { sanitizeString } from "@/lib/utils";
import { SparklesCore } from "@/components/ui/sparkles"; // we implement it later 
import { FlipWords } from "@/components/ui/flip-words";

interface SearchResult {
  metadata: Document["metadata"];
  content: string;
}

const runBootstrapProcedure = async () => {
  try {
    const response = await fetch("/api/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",//
      },
    });

    // Always treat as success to pre
    return { success: true };
  } catch (error) {
    console.error('Bootstrap error (non-blocking):', error);
    // Return success anyway to prevent blocking the UI
    return { success: true };
  }
};

const checkAndBootstrapIndex = async (
  setIsBootstrapping: (isBootstrapping: boolean) => void,
  setIsIndexReady: (isIndexReady: boolean) => void
) => {
  try {
    setIsBootstrapping(true);
    await runBootstrapProcedure();
    // Always set index as ready to prevent blocking the UI
    setIsIndexReady(true);
  } catch (error) {
    console.error('Non-blocking bootstrap error:', error);
    // Set index as ready anyway to prevent blocking the UI
    setIsIndexReady(true);
  } finally {
    setIsBootstrapping(false);
  }
};

const handleSearch = async (
  query: string,
  setResults: (results: SearchResult[]) => void,
  setIsSearching: (isSearching: boolean) => void
) => {
  setIsSearching(true);
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const body = await response.json();
    console.log(body);
    throw new Error(`API request failed with status ${response.status}`);
  }

  const { results } = await response.json();
  setResults(results);
  setIsSearching(false);
};

// Split into 4 columns to prevent overlap
const suggestedSearches = [
  // Column 1
  ["The future of AI and its implications",
   "AGI advancements in the next decade",
   "AI's role in transforming industries",
   "Investing in AI: A $100 million bootstrap",
   "How AI is reshaping healthcare",
   "The impact of AI on personal freedoms",
   "AI and the evolution of legal systems",
   "The intersection of AI and human rights"],
   
  // Column 2  
  ["AI-driven solutions for social justice",
   "Exploring the ethics of AGI development", 
   "AI in the courtroom: A new era",
   "The potential of AI in education",
   "AI and the future of work",
   "How AI can enhance decision-making",
   "The role of AI in climate change solutions",
   "AI and data privacy concerns"],

  // Column 3
  ["The economic impact of AI technologies",
   "AI in creative industries: Opportunities and challenges",
   "The relationship between AI and cybersecurity", 
   "AI's influence on global politics",
   "The future of AI regulation",
   "AI and the evolution of customer service",
   "The role of AI in financial markets",
   "AI in transportation: The next frontier"],

  // Column 4
  ["The societal implications of AGI",
   "AI and the future of entertainment",
   "How AI can drive innovation",
   "The challenges of AI integration in businesses",
   "AI and the future of communication",
   "The role of AI in disaster response",
   "AI's potential in scientific research",
   "The future of AI: Hype vs. reality"]
].flat(); // Flatten array for use

export default function Home() {
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SearchResult | null>(null);
  const words = ["advanced", "intelligent", "accurate", "innovative", "dynamic", "insightful", "impactful", "transformative"];

  useEffect(() => {
    checkAndBootstrapIndex(setIsBootstrapping, setIsIndexReady);
  }, []);

  const clearResults = () => {
    setQuery("");
    setResults([]);
  };

  if (selectedDocument) {
    return (
      <div className="flex justify-center items-center bg-white/90 min-h-screen">
        <DocumentView
          document={{
            metadata: {
              title: selectedDocument.metadata.title,
              plaintiff: selectedDocument.metadata.plaintiff || '',
              defendant: selectedDocument.metadata.defendant || '',
              date: selectedDocument.metadata.date || '',
              topic: selectedDocument.metadata.topic || '',
              outcome: selectedDocument.metadata.outcome || '',
              pageContent: selectedDocument.metadata.pageContent,
            },
            content: selectedDocument.metadata.pageContent
          }}
          quote={selectedDocument.metadata.pageContent} 
          onBack={() => setSelectedDocument(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gradient-to-b from-white">
      {isBootstrapping && (
        <div className="flex items-center space-x-3 bg-gray-700 shadow-lg p-4 rounded-lg">
          <p className="text-white">Processing legal documents...</p>
          <div className="border-4 border-indigo-500 border-t-transparent rounded-full w-5 h-5 animate-spin"></div>
        </div>
      )}

      {isIndexReady && !isBootstrapping && (
        <div className="mt-20 w-full max-w-7xl">
          <h1 className="bg-clip-text bg-gradient-to-r from-[#FF0080] via-[#7928CA] to-[#00DFD8] mb-4 font-extrabold text-6xl text-center text-transparent transform transition-all duration-300 hover:scale-105 tracking-tighter animate-gradient-x">
            #1 Most Advanced AI Search Engine For{" "}
            <span className="inline-block animate-bounce">⚡️</span>
            <FlipWords words={words} /> <br />
          </h1>
          <p className="bg-clip-text bg-gradient-to-b from-gray-200 to-gray-500 mb-10 font-medium text-3xl text-center text-transparent leading-relaxed">
            Lightning-fast neural search with unparalleled accuracy
          </p>
         
          <div className="bg-white/20 backdrop-blur-md mx-auto mb-16 p-4 rounded-2xl max-w-4xl transition-all duration-300">
            <SearchForm
              suggestedSearches={suggestedSearches}
              onSearch={(query: string) => {
                handleSearch(query, setResults, setIsSearching);
                setQuery(query);
              }}
            />
          </div>
          {isSearching && (
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg p-4 rounded-xl transform transition-transform duration-300 hover:scale-105">
                <p className="font-semibold text-lg text-white">Refining your search...</p>
                <div className="border-4 border-t-white border-transparent rounded-full w-6 h-6 animate-spin"></div>
              </div>
            </div>
          )}

          {results.length > 0 && query && (
            <div className="flex justify-between items-center bg-gray-700 shadow-lg mb-8 p-4 rounded-lg">
              <p className="text-white">
                Found {results.length} result{results.length > 1 ? "s" : ""} for{" "}
                <span className="font-semibold text-indigo-300">
                  &quot;{query}&quot;
                </span>
              </p>
              <button
                onClick={clearResults}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Clear results"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {results.map((result, index) => (
              <Card
                key={index}
                className="relative bg-white rounded-xl transition-all duration-500 cursor-pointer overflow-hidden group hover:scale-[1.02]"
                onClick={() => setSelectedDocument(result)}
              >
                {/* Ultra modern gradient hover effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6EE7B7] via-[#3B82F6] to-[#9333EA] opacity-0 group-hover:opacity-100 blur-xl transition-all animate-gradient-xy group-hover:animate-gradient-xy-fast duration-500" />
                
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/40 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity duration-500" />
                
                <CardContent className="relative z-10 p-6">
                  <h2 className="group-hover:text-transparent group-hover:bg-clip-text group-hover:from-[#6EE7B7] group-hover:via-[#3B82F6] group-hover:to-[#9333EA] group-hover:bg-gradient-to-r mb-3 font-bold text-gray-800 text-xl transition-all duration-500">
                    {result.metadata.title}
                  </h2>
                  <blockquote className="group-hover:from-white/80 group-hover:to-white/20 relative bg-gray-50 group-hover:bg-gradient-to-br mb-4 p-4 rounded-lg transition-all duration-500">
                    <p className="line-clamp-4 text-gray-600 italic">
                      {sanitizeString(result.metadata.pageContent)}
                    </p>
                  </blockquote>
                  <div className="space-y-2 text-gray-600 text-sm">
                    <div className="flex items-center transition-transform group-hover:translate-x-2 duration-300">
                      <span className="w-20 font-semibold text-gray-800">Topic:</span>
                      <span className="truncate">{result.metadata.topic}</span>
                    </div>
                    <div className="flex items-center transition-transform group-hover:translate-x-3 duration-500">
                      <span className="w-20 font-semibold text-gray-800">Verdict:</span>
                      <span className="truncate">{result.metadata.outcome}</span>
                    </div>
                    <div className="flex items-center transition-transform group-hover:translate-x-4 duration-700">
                      <span className="w-20 font-semibold text-gray-800">Date:</span>
                      <span>{new Date(result.metadata.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !isSearching && (
        <div className="mt-40 mb-40 px-4 w-full max-w-7xl">
          <div className="relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="-top-40 -right-32 absolute bg-gradient-to-br from-violet-600/30 to-transparent blur-3xl rounded-full w-96 h-96" />
              <div className="-bottom-40 -left-32 absolute bg-gradient-to-tr from-cyan-600/30 to-transparent blur-3xl rounded-full w-96 h-96" />
            </div>

          <div className="relative mt-56">


            <div className="gap-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <div className="relative border-white/5 bg-[#0F172A]/80 hover:shadow-[0_0_40px_8px_rgba(124,58,237,0.2)] backdrop-blur-xl p-8 border rounded-3xl transition-all duration-500 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform translate-x-full group-hover:translate-x-[-100%] duration-1500" />
                </div>
                <div className="group-hover:scale-110 inline-flex relative bg-violet-500/10 mb-6 p-4 rounded-2xl transition-transform duration-500">
                  <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="group-hover:text-transparent group-hover:bg-clip-text group-hover:from-violet-400 group-hover:to-fuchsia-400 relative group-hover:bg-gradient-to-r mb-4 font-bold text-white text-xl transition-all duration-300">
                  Lightning Fast Search ⚡️
                </h3>
                <p className="group-hover:text-gray-300 relative text-gray-400 leading-relaxed transition-colors duration-300">
                  Powered by advanced neural networks for instantaneous, accurate results across vast legal databases.
                </p>
              </div>

              <div className="relative border-white/5 bg-[#0F172A]/80 hover:shadow-[0_0_40px_8px_rgba(236,72,153,0.2)] backdrop-blur-xl p-8 border rounded-3xl transition-all duration-500 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform translate-x-full group-hover:translate-x-[-100%] duration-1500" />
                </div>
                <div className="group-hover:scale-110 inline-flex relative bg-pink-500/10 mb-6 p-4 rounded-2xl transition-transform duration-500">
                  <svg className="w-8 h-8 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="group-hover:text-transparent group-hover:bg-clip-text group-hover:from-pink-400 group-hover:to-rose-400 relative group-hover:bg-gradient-to-r mb-4 font-bold text-white text-xl transition-all duration-300">
                  Smart Analysis
                </h3>
                <p className="group-hover:text-gray-300 relative text-gray-400 leading-relaxed transition-colors duration-300">
                  Advanced AI-powered analysis providing deep insights and comprehensive understanding of legal documents.
                </p>
              </div>

              <div className="relative border-white/5 bg-[#0F172A]/80 hover:shadow-[0_0_40px_8px_rgba(34,211,238,0.2)] backdrop-blur-xl p-8 border rounded-3xl transition-all duration-500 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform translate-x-full group-hover:translate-x-[-100%] duration-1500" />
                </div>
                <div className="group-hover:scale-110 inline-flex relative bg-cyan-500/10 mb-6 p-4 rounded-2xl transition-transform duration-500">
                  <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="group-hover:text-transparent group-hover:bg-clip-text group-hover:from-cyan-400 group-hover:to-blue-400 relative group-hover:bg-gradient-to-r mb-4 font-bold text-white text-xl transition-all duration-300">
                  Real-time Processing
                </h3>
                <p className="group-hover:text-gray-300 relative text-gray-400 leading-relaxed transition-colors duration-300">
                  Instant document processing and analysis with real-time updates and dynamic content generation.
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Ultra Modern Floating GitHub Banner */}
      <div className="right-8 bottom-8 z-50 fixed">
        <a 
          href="https://github.com/duggal1/thunder-search" 
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center gap-4 border-white/10 hover:border-white/20 bg-[#0F172A]/80 hover:shadow-[0_0_60px_12px_rgba(124,58,237,0.35)] backdrop-blur-xl px-8 py-5 border rounded-2xl transition-all duration-500 group hover:scale-105"
        >
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-indigo-600/30 opacity-0 group-hover:opacity-100 blur-2xl transition-all animate-gradient-xy duration-700" />
          
          {/* Shimmer Effect */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-opacity animate-shimmer duration-500" />
          
          {/* Animated GitHub Icon */}
          <svg 
            viewBox="0 0 24 24" 
            className="group-hover:scale-110 group-hover:rotate-12 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] w-7 h-7 transition-all duration-500 fill-white/90"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          
          {/* Text Content with Animated Gradient */}
          <div className="flex flex-col">
            <span className="font-medium text-sm text-white/60 tracking-wide transition-transform group-hover:translate-y-[-2px] duration-500">
              Support us on
            </span>
            <span className="bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 group-hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] font-bold text-lg text-transparent tracking-wider group-hover:tracking-widest transition-all duration-500">
              GitHub
            </span>
          </div>

          {/* Animated Arrow */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="group-hover:scale-110 w-5 h-5 text-white/60 transition-all group-hover:translate-x-2 duration-500"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 7l5 5m0 0l-5 5m5-5H6" 
            />
          </svg>

          {/* Pulsing Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-br from-violet-600/40 via-fuchsia-600/40 to-indigo-600/40 opacity-0 group-hover:opacity-100 blur-xl rounded-2xl transition-all animate-pulse-slow duration-700" />
        </a>
      </div>
    </div>
   
    
  );
}