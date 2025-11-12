# Map Encoding Implementation Summary

## Overview
The MapView component has been updated to implement the detailed visual encoding specification from `mapcomponent.md`. Each article is now represented as a point on the map with multiple visual properties encoding different information.

## Visual Encoding Implementation

### 1. **Fill Color** - Valence (Red ↔ Grey ↔ Blue)
- **Negative (-1)**: Red (#ff3b3b)
- **Neutral (0)**: Grey (#9ca3af)
- **Positive (+1)**: Blue (#3b82f6)
- Maps sentiment/valence score to color gradient
- Implementation: `getValenceColor(valence)` function interpolates between colors

### 2. **Fill Opacity** - Trend Value (10-100%)
- Represents the trend value at publish time
- Opacity = `Math.max(0.1, trendValue / 100)`
- User-selectable for different metrics (highest, lowest, average, mean)

### 3. **Border Color** - Category
- **Retraction**: Red (#d32f2f)
- **Correction**: Orange (#f57c00)
- **Original**: Blue (#1976d2)
- **Disputed**: Amber (#f9a825)
- **Misleading**: Purple (#7b1fa2)
- Implementation: `getCategoryColor(category)` function

### 4. **Border Stroke Width** - Bias Rating
- Maps to bias rating from media bias CSV (-30 to +30)
- **-30 (Liberal bias)**: Blue (thin)
- **0 (Neutral)**: Medium width
- **+30 (Conservative bias)**: Red (thick)
- Stroke width calculation: `Math.max(0.5, Math.abs(bias) / 6)`

### 5. **Border Opacity** - Factual Reporting
- **MIXED**: 25% opacity (0.25)
- **HIGH**: 50% opacity (0.5)
- **VERY_HIGH**: 100% opacity (1.0)
- Implementation: `getFactualReportingOpacity(factualReporting)` function

### 6. **Marker Size** - Time Since First Article
- Radius scales from 20 (500 mi) to 2 (50 mi) over time
- Based on time difference between first article and current article
- Spans up to 30-day window
- Implementation: `getMarkerRadiusFromTime(firstArticleTime, publishDate)` function

### 7. **Concentric Markers** - Multiple Articles at Same Location
- Articles at the same location are displayed as concentric circles
- Inner circle = most recent or base marker
- Outer circles = additional articles at same location
- Radius offset of 3px per additional marker

## Updated MapMarker Interface

```typescript
interface MapMarker {
  // Existing properties
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  status: string;
  color: string;
  source?: string;
  city?: string;
  sentiment?: { score: number; comparative: number; };
  sentimentLabel?: string;
  trendValue?: number;
  trendTerms?: Array<{ term: string; value: number }>;
  publishDate?: string;
  
  // New encoding properties
  valence?: number; // -1 to 1 (red to grey to blue)
  category?: 'retraction' | 'original' | 'correction' | 'disputed' | 'misleading';
  bias?: number; // -30 to 30 (bias rating from CSV)
  factualReporting?: 'MIXED' | 'HIGH' | 'VERY_HIGH';
  firstArticleTime?: number; // timestamp of first article at location
}
```

## Legend Display

The map now includes an interactive legend that explains:
- Valence color mapping
- Category border colors
- Data encoding scheme (Size, Fill Opacity, Border Width, Border Opacity)
- Concentric marker explanation

Legend appears when trend polygons are present or can be toggled by users.

## Helper Functions Added

1. `getValenceColor(valence)` - Interpolates RGB color based on valence score
2. `getCategoryColor(category)` - Maps category to border color
3. `getBiasStrokeWidth(bias)` - Converts bias rating to stroke width
4. `getFactualReportingOpacity(factualReporting)` - Maps factual reporting to opacity
5. `getMarkerRadiusFromTime(firstArticleTime, publishDate)` - Calculates marker size

## Integration Steps

To use the updated map with full visual encoding:

1. Ensure marker data includes the new properties:
   - `valence`: From sentiment analysis or article valence classification
   - `category`: Article status/category
   - `bias`: From media bias CSV lookup by source domain
   - `factualReporting`: From media bias CSV lookup by source domain
   - `firstArticleTime`: Track first article timestamp at each location

2. Example marker with full encoding:
```typescript
{
  id: 'article-1',
  title: 'Article Title',
  latitude: 40.7128,
  longitude: -74.0060,
  status: 'original',
  color: '#3b82f6',
  source: 'bbc.com',
  city: 'New York',
  sentiment: { score: 0.5, comparative: 0.25 },
  sentimentLabel: 'positive',
  trendValue: 75,
  publishDate: '2024-11-12',
  valence: 0.6,
  category: 'original',
  bias: -13,
  factualReporting: 'HIGH',
  firstArticleTime: Date.parse('2024-11-01')
}
```

## Files Modified

- `/frontend/components/MapView.tsx` - Updated with new encoding implementation
- `/frontend/mapcomponent.md` - Reference specification document
