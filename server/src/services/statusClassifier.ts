/**
 * Status Classifier Stub - Phase 0 Demonstrator
 * Marks articles as 'original', 'correction', or 'retraction'
 */

export type ArticleStatus = 'original' | 'correction' | 'retraction' | 'inciting';

export interface ClassifiedStatus {
  status: ArticleStatus;
  confidence: number; // 0-1 scale
  reason: string;
}

// Keyword lists for classification
const retractionKeywords = [
  'retracted',
  'retraction',
  'withdrawn',
  'withdraw',
  'disavow',
  'incorrect',
  'false report'
];

const correctionKeywords = [
  'correction',
  'clarification',
  'clarify',
  'update',
  'updated',
  'amended',
  'amendment',
  'errata'
];

const incitingKeywords = [
  'urgent action',
  'call to action',
  'uprising',
  'rebellion',
  'extreme',
  'crisis',
  'emergency'
];

/**
 * Classify article status based on keywords
 */
export function classifyStatus(text: string): ClassifiedStatus {
  const lowerText = text.toLowerCase();
  
  // Check for retraction
  for (const keyword of retractionKeywords) {
    if (lowerText.includes(keyword)) {
      return {
        status: 'retraction',
        confidence: 0.95,
        reason: `Contains keyword: "${keyword}"`
      };
    }
  }
  
  // Check for correction
  for (const keyword of correctionKeywords) {
    if (lowerText.includes(keyword)) {
      return {
        status: 'correction',
        confidence: 0.90,
        reason: `Contains keyword: "${keyword}"`
      };
    }
  }
  
  // Check for inciting language
  for (const keyword of incitingKeywords) {
    if (lowerText.includes(keyword)) {
      return {
        status: 'inciting',
        confidence: 0.80,
        reason: `Contains keyword: "${keyword}"`
      };
    }
  }
  
  // Default to original
  return {
    status: 'original',
    confidence: 1.0,
    reason: 'No classification keywords detected'
  };
}
