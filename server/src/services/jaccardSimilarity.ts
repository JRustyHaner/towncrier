/**
 * Jaccard Similarity Filter - Lenient Version
 * 
 * Filters articles based on minimal overlap with combined title vocabulary.
 * Uses a very lenient threshold to avoid removing too many articles.
 * Only removes articles that share NO words with the overall topic.
 * 
 * Jaccard Similarity = |intersection| / |union|
 * Range: 0 (completely different) to 1 (identical)
 */

/**
 * Normalize and tokenize text into words only
 */
function tokenizeText(text: string): Set<string> {
  // Convert to lowercase and split on non-alphanumeric characters
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[^a-z0-9]/g, ''))
    .filter(word => word.length > 2) // Ignore very short words
    .map(word => word.trim())
    .filter(word => word.length > 0);

  return new Set(words);
}

/**
 * Calculate intersection size between two word sets
 * (simpler than full Jaccard for this use case)
 */
function calculateIntersectionCount(set1: Set<string>, set2: Set<string>): number {
  return new Set([...set1].filter(x => set2.has(x))).size;
}

/**
 * Filter articles based on word overlap with combined vocabulary
 * Very lenient - removes only articles with ZERO word overlap
 * 
 * @param articles - Array of articles with title, description, content
 * @param minIntersection - Minimum number of overlapping words to keep article. Default: 1 (keep if ANY word matches)
 * @returns Filtered array of articles that meet minimum overlap requirement
 */
export function filterArticlesBySimilarity<T extends { title?: string; description?: string; content?: string; }>(
  articles: T[],
  minIntersection: number = 1
): T[] {
  if (articles.length === 0) return articles;
  if (minIntersection < 1) minIntersection = 1; // At least 1 word overlap

  // Combine all titles to create vocabulary set
  const allTitlesText = articles
    .map(article => article.title || '')
    .join(' ');

  const vocabularySet = tokenizeText(allTitlesText);

  if (vocabularySet.size === 0) return articles; // No valid words to filter on

  // Filter articles: keep only those with at least minIntersection overlapping words
  const filtered = articles.filter(article => {
    const titleText = article.title || '';
    const titleTokens = tokenizeText(titleText);
    const overlapCount = calculateIntersectionCount(titleTokens, vocabularySet);

    return overlapCount >= minIntersection;
  });

  const removed = articles.length - filtered.length;
  console.log(`[JaccardFilter] Input: ${articles.length} articles, Vocabulary: ${vocabularySet.size} unique words`);
  console.log(`[JaccardFilter] Kept: ${filtered.length}, Removed: ${removed} (min overlap: ${minIntersection} words)`);

  if (removed > 0) {
    const removedArticles = articles.filter(a => !filtered.includes(a)).slice(0, 3);
    if (removedArticles.length > 0) {
      console.log(`[JaccardFilter] Example removed: ${removedArticles.map(a => (a.title || 'no title').substring(0, 60)).join(' | ')}`);
    }
  }

  return filtered;
}

/**
 * Get similarity statistics for debugging
 */
export function getSimilarityStats<T extends { title?: string; description?: string; content?: string; }>(
  articles: T[],
  minIntersection: number = 1
): { overlapCounts: number[]; mean: number; min: number; max: number; belowThreshold: number } {
  if (articles.length === 0) {
    return { overlapCounts: [], mean: 0, min: 0, max: 0, belowThreshold: 0 };
  }

  // Combine all titles to create vocabulary
  const allTitlesText = articles
    .map(article => article.title || '')
    .join(' ');

  const vocabularySet = tokenizeText(allTitlesText);

  if (vocabularySet.size === 0) {
    return { overlapCounts: [], mean: 0, min: 0, max: 0, belowThreshold: 0 };
  }

  const overlapCounts = articles.map(article => {
    const titleText = article.title || '';
    const titleTokens = tokenizeText(titleText);
    return calculateIntersectionCount(titleTokens, vocabularySet);
  });

  const belowThreshold = overlapCounts.filter(c => c < minIntersection).length;
  const mean = overlapCounts.reduce((a, b) => a + b, 0) / overlapCounts.length;

  return {
    overlapCounts,
    mean,
    min: Math.min(...overlapCounts),
    max: Math.max(...overlapCounts),
    belowThreshold
  };
}
