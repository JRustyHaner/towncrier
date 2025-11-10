# Enhanced Misinformation Detection System

## Overview

The Towncrier misinformation detection system has been enhanced with a sophisticated, multi-signal approach to identify and classify problematic content. Rather than relying on simple keyword matching, the new system analyzes articles across multiple dimensions to detect retractions, corrections, inciting language, and potential misinformation patterns.

## Classification Categories

### 1. **Retraction** (Red Circle - #ef4444)
Articles that explicitly withdraw or disavow previous claims.

**Detection signals:**
- Explicit keywords: "retracted", "retraction", "withdrawn", "disavow"
- Phrases: "we apologize for", "retract our claim", "factually inaccurate"
- Confidence: 0.95 (very high)

### 2. **Correction** (Orange Square - #f59e0b)
Articles that clarify or amend previous information.

**Detection signals:**
- Keywords: "correction", "clarification", "amendment", "errata"
- Phrases: "editor's note", "set the record straight", "clarifies that"
- Confidence: 0.85 (high)

### 3. **Inciting** (Blue Ring - #137fec)
Content designed to provoke violent or harmful action.

**Detection signals:**
- Keywords: "uprising", "rebellion", "violence", "attack", "overthrow"
- Phrases: "urgent action", "rise up", "must act now"
- Confidence: 0.80 (high)

### 4. **Disputed** (Purple Hexagon - #a78bfa)
Content presenting contested or competing claims.

**Detection signals:**
- Language: "disputed", "controversial", "hotly debated", "conflicting reports"
- Multiple perspectives without clear resolution
- Confidence: 0.55-0.75 (moderate)

### 5. **Misleading** (Orange Diamond - #f97316)
Content with multiple misinformation indicators.

**Detection signals:**
- Sensationalism patterns
- Conspiracy language
- Unsubstantiated claims
- False expertise claims
- Confidence: 0.65-0.95 (variable)

### 6. **Original** (Green Triangle - #22c55e)
Mainstream, factual reporting without red flags.

**Detection signals:**
- No concerning keywords or patterns detected
- Confidence: 1.0 (absolute)

## Misinformation Signal Detection

The system analyzes content for six categories of misinformation indicators:

### A. Unsubstantiated Claims
- "allegedly", "unconfirmed", "sources say", "might be"
- Indicates reporting on unverified information
- Weight: +0.15 per occurrence

### B. Sensationalism
- "shocking", "you won't believe", "doctors hate", "one simple trick"
- Common clickbait and false advertisement patterns
- Weight: +0.20 per occurrence

### C. Conspiracy Language
- "conspiracy", "cover-up", "hidden truth", "deep state"
- Indicates conspiratorial framing
- Weight: +0.25 per occurrence (highest impact)
- **Triggers immediate misleading classification**

### D. False Expertise Claims
- "experts agree", "scientists confirm", "leaked documents"
- Appeal to false or vague authority
- Weight: +0.18 per occurrence

### E. Sensational Phrases
- "shocking", "exclusive", "breaking", "MAJOR"
- Emotional manipulation patterns
- Weight: +0.20 per occurrence

## Implementation Details

### Core Classification Function

```typescript
export function classifyStatus(text: string, contentSample?: string): ClassifiedStatus
```

**Parameters:**
- `text`: Combined title and description (required)
- `contentSample`: Full article content for deeper analysis (optional)

**Returns:**
```typescript
{
  status: ArticleStatus,      // Classification category
  confidence: number,          // 0-1 confidence score
  reason: string,             // Human-readable explanation
  signals?: string[]          // List of detected indicators
}
```

### Signal Analysis Function

```typescript
export function detectMisinformationPatterns(content: string, signals: string[]): number
```

Analyzes full content for misinformation patterns and returns aggregated confidence score.

### Metrics Aggregation

```typescript
export function analyzeMisinformationMetrics(
  classifications: ClassifiedStatus[]
): {
  highConfidenceIncidents: number,
  potentialMisinformation: number,
  misdirectedContent: number,
  topSignals: Map<string, number>
}
```

Aggregates individual article classifications into search-wide metrics.

## API Endpoints

### 1. Classification Debug Endpoint
```
POST /api/classify
```

**Request:**
```json
{
  "title": "Article title",
  "description": "Article description",
  "content": "Full article content (optional)"
}
```

**Response:**
```json
{
  "input": {
    "title": "Article title",
    "description": "Article description",
    "contentLength": 5000
  },
  "classification": {
    "status": "misleading",
    "confidence": 0.82,
    "reason": "Detected: conspiracy-language: \"cover-up\"; sensationalism: \"shocking\"",
    "signals": [
      "conspiracy-language: \"cover-up\"",
      "sensationalism: \"shocking\"",
      "unsubstantiated: \"sources say\""
    ]
  }
}
```

### 2. Misinformation Report Endpoint
```
GET /api/search/:id/misinformation-report
```

**Response:**
```json
{
  "search_id": "search-123",
  "analysis": {
    "totalArticles": 50,
    "articlesWithSignals": 12,
    "signalPercentage": "24.00%",
    "topMisinformationPatterns": [
      { "pattern": "sensationalism: \"shocking\"", "count": 7 },
      { "pattern": "unsubstantiated: \"allegedly\"", "count": 5 },
      { "pattern": "false-expertise: \"experts agree\"", "count": 3 }
    ],
    "highRiskArticles": [
      {
        "title": "Breaking: Cover-up Revealed!",
        "status": "misleading",
        "confidence": 0.88,
        "reason": "Detected: conspiracy-language: \"cover-up\"",
        "signals": ["conspiracy-language: \"cover-up\""],
        "source": "Example News",
        "link": "https://example.com/article"
      }
    ]
  }
}
```

### 3. Enhanced Results Endpoint
```
GET /api/search/:id/results
```

**Enhanced Response:**
```json
{
  "search_id": "search-123",
  "ready": true,
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-74.006, 40.7128]
        },
        "properties": {
          "id": "article-1",
          "title": "Article Title",
          "status": "misleading",
          "statusConfidence": 0.82,
          "statusReason": "Detected: conspiracy-language: \"cover-up\"",
          "detectedSignals": [
            "conspiracy-language: \"cover-up\"",
            "sensationalism: \"shocking\""
          ],
          "city": "New York",
          "source": "Example News"
        }
      }
    ]
  },
  "summary": {
    "total": 50,
    "originals": 38,
    "corrections": 2,
    "retractions": 1,
    "inciting": 2,
    "disputed": 4,
    "misleading": 3
  },
  "misinformationMetrics": {
    "highConfidenceIncidents": 6,
    "potentialMisinformation": 7,
    "misdirectedContent": 2,
    "topSignals": [
      ["sensationalism: \"shocking\"", 7],
      ["unsubstantiated: \"allegedly\"", 5],
      ["false-expertise: \"experts agree\"", 3]
    ]
  }
}
```

## Confidence Scoring

Confidence scores are calculated based on:

1. **Explicit keyword matching** (highest priority)
   - Retraction keywords: 0.95 confidence
   - Correction keywords: 0.85 confidence
   - Inciting keywords: 0.80 confidence

2. **Pattern analysis** (secondary)
   - Multiple misinformation signals aggregated
   - Conspiracy language: immediate high confidence
   - Each signal adds 0.15-0.25 to base score

3. **Disputed language** (tertiary)
   - Conflicting narratives detected
   - Confidence: 0.55-0.75

4. **No signals** (default)
   - Original status: 1.0 confidence (absolute)

## Usage Examples

### Example 1: Detecting a Retraction
```
Title: "We Retract Our Previous Claim About COVID"
Description: "After further research, we formally retract our statement"

Result:
- Status: retraction
- Confidence: 0.95
- Reason: "Detected: explicit-retraction: \"retract\""
```

### Example 2: Detecting Misinformation
```
Title: "Shocking Cover-up Revealed!"
Description: "You won't believe what doctors don't want you to know..."

Result:
- Status: misleading
- Confidence: 0.88
- Reason: "Detected: conspiracy-language: \"cover-up\"; sensationalism: \"shocking\""
- Signals: [
    "conspiracy-language: \"cover-up\"",
    "sensationalism: \"shocking\"",
    "false-expertise: \"doctors don't want\""
  ]
```

### Example 3: Detecting Disputed Content
```
Title: "Study Shows Conflicting Results on New Treatment"
Description: "Some researchers claim benefits, others report concerns"

Result:
- Status: disputed
- Confidence: 0.65
- Reason: "Detected: disputed-language: \"conflicting\""
- Signals: ["disputed-language: \"conflicting\""]
```

## Future Enhancements

1. **Machine Learning Integration**
   - Train models on labeled misinformation datasets
   - Combine rule-based and ML-based classification

2. **Source Reputation Scoring**
   - Track historical accuracy of sources
   - Adjust confidence based on source reliability

3. **Cross-Reference Verification**
   - Check if claims are fact-checked elsewhere
   - Link to authoritative fact-checking sources

4. **Temporal Analysis**
   - Track when articles were published
   - Detect disinformation campaigns over time

5. **Image Analysis**
   - Detect manipulated or out-of-context images
   - Reverse image search verification

6. **Real-time Fact-Checking APIs**
   - Integration with fact-checking databases
   - Live verification during article processing

7. **User Feedback Loop**
   - Allow users to report false classifications
   - Train and improve models over time

## Testing the System

Use the `/api/classify` endpoint to test individual articles:

```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Breaking: Shocking Truth Revealed!",
    "description": "You wont believe what doctors dont want you to know...",
    "content": "This article contains conspiracy language and sensationalism..."
  }'
```

## Performance Considerations

- **Text Processing:** O(n) where n = text length
- **Signal Detection:** Multiple passes through keyword lists
- **Memory:** Minimal - signals stored as string array
- **Caching:** Results cached per search session
- **Scalability:** Thread-safe, suitable for concurrent processing

## References

- [Misinformation Indicators](https://www.nature.com/articles/d41586-021-00970-8)
- [Content Analysis Best Practices](https://en.wikipedia.org/wiki/Content_analysis)
- [Fact-Checking Methodology](https://www.poynter.org/fact-checking/)
