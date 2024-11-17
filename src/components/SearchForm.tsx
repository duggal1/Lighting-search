import { useState, ChangeEvent, FormEvent } from 'react';

interface SearchFormProps {
  suggestedSearches: string[];
  onSearch: (query: string) => void;
}

const SearchForm: React.FC<SearchFormProps> = ({ suggestedSearches, onSearch }) => {
  const [query, setQuery] = useState<string>("");
  const [suggestions] = useState<string[]>(suggestedSearches);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
    setQuery("");
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  const handleClear = () => {
    setQuery("");
    setShowSuggestions(true);
  };

  return (
    <div className="relative z-50 mx-auto w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="relative w-full group">
        <div className="group-hover:blur-3xl absolute inset-0 bg-gradient-to-r from-pink-500/90 via-cyan-500/90 to-purple-400 blur-2xl rounded-2xl transition-all duration-500"></div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className="border-0 bg-white/90 dark:bg-gray-900/80 hover:bg-gradient-to-r dark:hover:bg-gradient-to-r hover:from-white/95 dark:hover:from-gray-900/90 hover:to-white/90 dark:hover:to-gray-800/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_60px_-12px_rgba(129,140,248,0.5)] backdrop-blur-2xl px-6 py-4 rounded-2xl hover:ring-4 hover:ring-purple-400/20 focus:ring-4 focus:ring-purple-500/30 w-full placeholder:font-light text-gray-700 placeholder:text-gray-400/70 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-400/50 transition-all hover:translate-y-[-2px] duration-500 ease-out hover:scale-[1.02]"
          placeholder="Search legal docs or view suggestions..."
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="top-1/2 right-20 absolute text-gray-400 hover:text-gray-600 transform transition-colors -translate-y-1/2 duration-200 hover:scale-110"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          disabled={!query}
          className={`absolute top-1/2 transform -translate-y-1/2 -right-16 w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-violet-800 text-white shadow-xl hover:shadow-[0_0_30px_rgba(129,140,248,0.6)] transition-all duration-500 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed disabled:bg-gradient-to-br disabled:from-gray-400 disabled:to-gray-500`}
        >
          <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="z-10 absolute border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl mt-4 border rounded-2xl w-full max-h-80 overflow-y-auto">
            <div className="border-gray-100/80 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 px-6 py-3 border-b font-medium text-gray-700">
              Popular searches
            </div>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors duration-200 cursor-pointer"
                onClick={() => setQuery(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchForm;
