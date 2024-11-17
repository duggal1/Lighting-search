import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const sanitizeString = (str: string) => {
  return str.replace(/[^\x20-\x7E]/g, (char) => {
    return '';
  });
};

export function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const wordFreq = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word]) => word);
}

export const validateContent = (content: string, section: string, minWords: number): boolean => {
  const wordCount = content.split(/\s+/).length;
  return wordCount >= minWords;
};

export const processMarkdown = (content: string): string => {
  // Enhanced markdown processing
  const sections = content.split(/#{2,3}\s+/);
  return sections.map(section => {
    if (section.trim().length === 0) return '';
    
    // Add formatting and structure
    return `## ${section.trim()}\n\n${
      section.split('\n').map(line => 
        line.trim().startsWith('-') ? `• ${line.slice(1).trim()}` : line
      ).join('\n')
    }`;
  }).join('\n\n');
};



