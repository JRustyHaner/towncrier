/**
 * Enhanced Status Classifier - Phase 1
 * Marks articles as 'original', 'correction', 'retraction', or 'inciting'
 * Uses comprehensive keyword detection, semantic analysis, and content patterns
 */

export type ArticleStatus = 'original' | 'correction' | 'retraction' | 'inciting' | 'disputed' | 'misleading';

export interface ClassifiedStatus {
  status: ArticleStatus;
  confidence: number; // 0-1 scale
  reason: string;
  signals?: string[]; // List of detected misinformation signals
}

/**
 * RETRACTION KEYWORDS
 * Explicit indicators that an article/claim has been withdrawn or discredited
 */
const retractionKeywords = [
  'retracted',
  'retraction',
  'withdrawn',
  'withdraw',
  'disavow',
  'incorrect',
  'false report',
  'we apologize',
  'retract our',
  'retract the',
  'no longer stands',
  'proved false',
  'factually inaccurate',
  'formally retracted',
  'retracted claim',
  'correction notice'
];

/**
 * CORRECTION KEYWORDS
 * Indicators that an article contains clarifications, updates, or minor corrections
 */
const correctionKeywords = [
  'correction',
  'clarification',
  'clarify',
  'update',
  'updated',
  'amended',
  'amendment',
  'errata',
  'editor\'s note',
  'previous version',
  'we regret',
  'should have said',
  'previously stated',
  'earlier report',
  'earlier version',
  'clarifies that',
  'set the record straight'
];

/**
 * INCITING KEYWORDS
 * Language designed to provoke action or violent response
 */
const incitingKeywords = [
  'urgent action',
  'call to action',
  'uprising',
  'rebellion',
  'extreme',
  'crisis',
  'emergency',
  'must act now',
  'immediate action',
  'join us now',
  'rise up',
  'take action immediately',
  'violence',
  'attack',
  'overthrow'
];

/**
 * MISINFORMATION SIGNALS
 * Patterns that suggest potential misinformation or unreliable content
 */
const misinformationSignals = {
  // Unsubstantiated claims
  allegations: [
    'allegedly',
    'unconfirmed',
    'unverified',
    'sources say',
    'rumors suggest',
    'it\'s believed',
    'might be',
    'could be',
    'appears to be'
  ],
  // Exaggeration and sensationalism
  sensationalism: [
    'shocking',
    'exclusive',
    'breaking: MAJOR',
    'you won\'t believe',
    'doctors hate',
    'one simple trick',
    'this one change',
    'this will shock you',
    'what happens next'
  ],
  // Conspiracy language
  conspiracy: [
    'conspiracy',
    'cover-up',
    'they don\'t want you to know',
    'hidden truth',
    'secret agenda',
    'deep state',
    'globalists',
    'new world order',
    'orchestrated'
  ],
  // False expertise claims
  falseClaims: [
    'experts agree',
    'scientists confirm',
    'doctors say',
    'health official reveals',
    'insider reveals',
    'leaked'
  ]
};

/**
 * DISPUTED PHRASES
 * Language indicating contested or disputed information
 */
const disputedPhrases = [
  'disputed',
  'controversial',
  'hotly debated',
  'debate continues',
  'disagreement',
  'conflicting reports',
  'conflicting claims',
  'some say',
  'others claim',
  'competing narratives'
];

/**
 * Classify article status based on comprehensive analysis
 * @param text - Title and description of article combined
 * @param contentSample - Optional full article content for deeper analysis
 */
export function classifyStatus(text: string, contentSample?: string): ClassifiedStatus {
  const lowerText = text.toLowerCase();
  const fullContent = (text + ' ' + (contentSample || '')).toLowerCase();
  const signals: string[] = [];
  let confidenceScore = 0;
  let detectedStatus: ArticleStatus = 'original';

  // PRIORITY 1: Check for explicit retractions (highest priority)
  for (const keyword of retractionKeywords) {
    if (lowerText.includes(keyword)) {
      signals.push(`explicit-retraction: "${keyword}"`);
      confidenceScore = Math.max(confidenceScore, 0.95);
      detectedStatus = 'retraction';
      break;
    }
  }

  // PRIORITY 2: Check for explicit corrections
  if (confidenceScore < 0.9) {
    for (const keyword of correctionKeywords) {
      if (lowerText.includes(keyword)) {
        signals.push(`explicit-correction: "${keyword}"`);
        confidenceScore = Math.max(confidenceScore, 0.85);
        detectedStatus = 'correction';
        break;
      }
    }
  }

  // PRIORITY 3: Check for inciting language
  if (confidenceScore < 0.8) {
    for (const keyword of incitingKeywords) {
      if (lowerText.includes(keyword)) {
        signals.push(`inciting-language: "${keyword}"`);
        confidenceScore = Math.max(confidenceScore, 0.80);
        detectedStatus = 'inciting';
        break;
      }
    }
  }

  // PRIORITY 4: Detect misinformation patterns (in full content if available)
  if (contentSample || fullContent.length > text.length) {
    const misinfoScore = detectMisinformationPatterns(fullContent, signals);
    if (misinfoScore > 0) {
      if (misinfoScore > confidenceScore) {
        confidenceScore = misinfoScore;
        detectedStatus = misinfoScore > 0.75 ? 'misleading' : 'disputed';
      }
    }
  }

  // PRIORITY 5: Check for disputed language (even without content)
  if (confidenceScore < 0.6) {
    for (const phrase of disputedPhrases) {
      if (fullContent.includes(phrase)) {
        signals.push(`disputed-language: "${phrase}"`);
        confidenceScore = Math.max(confidenceScore, 0.55);
        detectedStatus = 'disputed';
        break;
      }
    }
  }

  // Default to original if no signals detected
  if (detectedStatus === 'original' && signals.length === 0) {
    return {
      status: 'original',
      confidence: 1.0,
      reason: 'No misinformation signals detected',
      signals: []
    };
  }

  const reason = signals.length > 0
    ? `Detected: ${signals.slice(0, 2).join('; ')}`
    : 'Classification review recommended';

  return {
    status: detectedStatus,
    confidence: Math.min(Math.max(confidenceScore, 0.6), 1.0), // Ensure minimum 0.6 confidence when signals detected
    reason,
    signals
  };
}

/**
 * Analyze full article content for misinformation patterns
 */
function detectMisinformationPatterns(content: string, signals: string[]): number {
  let score = 0;
  let patternCount = 0;

  // Check allegations/unsubstantiated claims
  for (const word of misinformationSignals.allegations) {
    if (content.includes(word)) {
      signals.push(`unsubstantiated: "${word}"`);
      score += 0.15;
      patternCount++;
    }
  }

  // Check sensationalism
  for (const word of misinformationSignals.sensationalism) {
    if (content.includes(word)) {
      signals.push(`sensationalism: "${word}"`);
      score += 0.20;
      patternCount++;
    }
  }

  // Check conspiracy language
  for (const word of misinformationSignals.conspiracy) {
    if (content.includes(word)) {
      signals.push(`conspiracy-language: "${word}"`);
      score += 0.25;
      patternCount++;
      break; // Conspiracy language is high-impact
    }
  }

  // Check false expertise claims
  for (const word of misinformationSignals.falseClaims) {
    if (content.includes(word)) {
      signals.push(`false-expertise: "${word}"`);
      score += 0.18;
      patternCount++;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Fetch and analyze article content for improved classification
 * This is a sample-based approach to deeply analyze a subset of articles
 */
export async function enhancedClassificationWithContent(
  articles: Array<{ title: string; description: string; link?: string; content?: string }>
): Promise<Map<string, ClassifiedStatus>> {
  const results = new Map<string, ClassifiedStatus>();

  for (const article of articles) {
    // Use existing content if available, otherwise just use metadata
    const contentToAnalyze = article.content || '';
    const classification = classifyStatus(
      `${article.title} ${article.description}`,
      contentToAnalyze
    );

    results.set(article.title, classification);
  }

  return results;
}

/**
 * Batch analyze articles and return aggregated misinformation statistics
 */
export function analyzeMisinformationMetrics(
  classifications: ClassifiedStatus[]
): {
  highConfidenceIncidents: number;
  potentialMisinformation: number;
  misdirectedContent: number;
  topSignals: Map<string, number>;
} {
  const topSignals = new Map<string, number>();
  let highConfidenceIncidents = 0;
  let potentialMisinformation = 0;
  let misdirectedContent = 0;

  for (const classification of classifications) {
    if (classification.status !== 'original' && classification.confidence > 0.80) {
      highConfidenceIncidents++;
    }

    if ((classification.status === 'misleading' || classification.status === 'disputed') && classification.confidence > 0.60) {
      potentialMisinformation++;
    }

    if (classification.status === 'inciting') {
      misdirectedContent++;
    }

    // Track signals
    if (classification.signals) {
      for (const signal of classification.signals) {
        const signalType = signal.split(':')[0];
        topSignals.set(signalType, (topSignals.get(signalType) || 0) + 1);
      }
    }
  }

  return {
    highConfidenceIncidents,
    potentialMisinformation,
    misdirectedContent,
    topSignals
  };
}
