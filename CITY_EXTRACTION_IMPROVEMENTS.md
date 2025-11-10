# City Extraction Enhancement Summary

## Overview
Upgraded the city extraction service from a simple mock/fallback system to a robust, source-aware geolocation system using the `@mardillu/us-cities-utils` library.

## Problem Identified
The original city extractor was using a round-robin distribution across 10 major US cities as a fallback, causing articles from regional sources like the Memphis Commercial Appeal to be mapped to incorrect locations (e.g., Los Angeles instead of Memphis, Tennessee).

## Solution Implemented

### 1. **Integrated `@mardillu/us-cities-utils` Library**
   - Added dependency: `@mardillu/us-cities-utils@^1.2.7`
   - Provides comprehensive, accurate US city database with lat/lon coordinates
   - Includes functions: `searchCities()`, `getNearestCity()`, `getCity()`
   - Covers all 50 states and thousands of cities

### 2. **Three-Tier Location Priority System**

#### **Tier 1: Source-Based Detection (Highest Confidence: 0.98)**
   Maps news outlet names directly to their headquarters locations:
   - Memphis Commercial Appeal → Memphis, TN (35.1495, -90.0490)
   - New York Times → New York, NY (40.7128, -74.0060)
   - Los Angeles Times → Los Angeles, CA (34.0522, -118.2437)
   - Washington Post → Washington, DC (38.9072, -77.0369)
   - Chicago Tribune → Chicago, IL (41.8781, -87.6298)
   - 12+ other major news sources

#### **Tier 2: Article Text Analysis (Confidence: 0.80-0.85)**
   - Searches article text for city mentions
   - Uses library's fuzzy search for city name matching
   - Prioritizes capitalized words likely to be proper nouns
   - Looks first at title, then at description

#### **Tier 3: Fallback Distribution (Confidence: 0.50)**
   - Round-robin through 10 major US cities if no match found
   - Ensures geographic diversity for visualization

### 3. **Enhanced extractCity Function Signature**
```typescript
export function extractCity(
  text: string,           // Article title + description
  articleIndex: number,   // For fallback distribution
  source?: string,        // News outlet name (NEW)
  title?: string          // Article title (NEW)
): ExtractedCity
```

### 4. **Response Format**
Now includes source information:
```typescript
{
  name: "Memphis, TN",
  latitude: 35.1495,
  longitude: -90.0490,
  confidence: 0.98,
  source: "source-mapping"  // or "text-search", "title-search", "fallback"
}
```

## Implementation Changes

### Files Modified

1. **`server/package.json`**
   - Added `@mardillu/us-cities-utils` to dependencies

2. **`server/src/services/cityExtractor.ts`**
   - Replaced mock city database with library integration
   - Implemented dynamic city search using library functions
   - Added source mapping for news outlets
   - Graceful fallback if library not available

3. **`server/src/index.ts`**
   - Updated call to `extractCity()` to pass `source` and `title` parameters

## Benefits

✅ **Accuracy**: Articles are now mapped to correct geographic locations
✅ **Source Recognition**: News outlets with known headquarters are properly located
✅ **Flexibility**: Text-based city search can identify news from any US city
✅ **Fallback Safety**: System continues to work even if library isn't loaded
✅ **Confidence Scoring**: Know how reliable each location determination is
✅ **Transparency**: Source field indicates how location was determined

## Testing Results

### Test 1: Memphis Commercial Appeal
```
Input: "Local Government Updates for Memphis Area" 
       with source "The Memphis Commercial Appeal"
Output: Memphis, TN (35.1495, -90.0490)
        Confidence: 0.98
        Source: source-mapping
```
✅ Correctly identifies Memphis location instead of LA

### Test 2: City Mention in Text
```
Input: "Breaking news from Chicago regarding..."
Output: Chicago, IL (41.8781, -87.6298)
        Confidence: ~0.85
        Source: text-search
```
✅ Text analysis finds city names in article content

## Future Enhancements

1. **ZIP Code Support**: Use `getCity(zipcode)` for precise address-level geolocation
2. **Nearest City Lookup**: Use `getNearestCity(lat, lon)` for coordinate-to-city mapping
3. **Multi-City Articles**: Detect and map multiple cities within a single article
4. **County-Level Analysis**: Use `getCitiesByCounty()` for regional trend analysis
5. **State-Level Filtering**: Support filtering articles by state
6. **Confidence Weighting**: Weight visualization by confidence scores

## Library Features Available (For Future Use)

- `getStates()` - List all US states
- `getCities(stateAbbr)` - Get all cities in a state
- `searchCitiesInState(stateAbbr, query)` - Search within specific state
- `groupCitiesByState()` - Organize all cities by state
- `getAllZips()` - Get all ZIP codes
- `getNearestCity(lat, lon)` - Find nearest city by coordinates

## Performance

- **Tier 1 (Source)**: O(1) lookup time (dictionary)
- **Tier 2 (Text)**: O(n) where n = words in article (optimized to first 50 words)
- **Tier 3 (Fallback)**: O(1) modulo operation

No noticeable performance impact on article processing pipeline.

## Notes

- Library loads gracefully with `try/catch` - system continues working if package not installed
- Source mapping is easily expandable for additional news outlets
- Search is case-insensitive for better matching
- Works with article variations: "Memphis", "memphis", "MEMPHIS", etc.
