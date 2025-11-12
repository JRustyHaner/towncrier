# Trend Value Selector Implementation

## Overview
Added a UI dropdown selector that allows users to choose how trend values are calculated for map marker fill opacity. This addresses the specification for user-selectable trend metrics.

## New Component: TrendValueSelector

**Location:** `/frontend/components/TrendValueSelector.tsx`

### Features
- **4 Trend Value Modes:**
  - **Maximum** (default): Highest trend value among all terms
  - **Minimum**: Lowest trend value among all terms  
  - **Average**: Mean trend value across all terms
  - **Primary Term**: Only the main search term (ignores related phrases)

### UI Elements
- Button displays current selection with icon and description
- Modal dropdown with all available options
- Each option includes:
  - Icon representation
  - Clear label
  - Detailed description
  - Visual indicator of selected mode
- Footer note explaining the impact on map opacity
- Dark mode support

### Styling
- Integrates with existing dark/light theme
- Responsive design
- Smooth animations for modal
- Accessible touch targets (minimum 40px)

## Integration with App.tsx

### Changes Made

1. **Import Statement:**
   ```typescript
   import TrendValueSelector, { TrendValueMode } from './components/TrendValueSelector';
   ```

2. **State Variable:**
   ```typescript
   const [trendValueMode, setTrendValueMode] = useState<TrendValueMode>('max');
   ```

3. **Helper Function:**
   ```typescript
   const calculateTrendValue = (mainValue: number, allTermsValues: number[]): number => {
     switch (trendValueMode) {
       case 'max':
         return Math.max(mainValue, ...allTermsValues);
       case 'min':
         return Math.min(mainValue, ...allTermsValues);
       case 'average':
         const allValues = [mainValue, ...allTermsValues].filter(v => v > 0);
         return allValues.length > 0 
           ? allValues.reduce((a, b) => a + b, 0) / allValues.length 
           : 0;
       case 'primary':
         return mainValue;
       default:
         return mainValue;
     }
   };
   ```

4. **Map View Integration:**
   - TrendValueSelector component added above MapView
   - Map markers now use calculated trend value based on user selection
   - Trend value immediately affects marker fill opacity on mode change
   - Component is rendered in a Fragment to allow both selector and map

## User Experience Flow

1. User performs a search and articles appear on map
2. User clicks TrendValueSelector button to open dropdown
3. User selects desired trend calculation mode
4. Map instantly updates with new marker opacities based on selected mode
5. Marker fill opacity now reflects chosen calculation: max/min/average/primary

## Data Flow

```
User selects mode → setTrendValueMode() → 
Component re-renders → calculateTrendValue() called for each article → 
New trendValue passed to MapView → 
Markers update with new fill opacity
```

## Impact on Map Encoding

The fill opacity encoding (from mapcomponent.md specification) now becomes dynamic:
- **Before:** Always used maximum trend value (hardcoded)
- **After:** User can choose between max, min, average, or primary term

This gives users control over how prominently different trend behaviors are visualized:
- **Max mode:** Highlights articles when ANY related term is trending
- **Min mode:** Shows conservative trend representation
- **Average mode:** Balanced middle-ground
- **Primary mode:** Focuses only on the main search term

## Files Modified
- `/frontend/App.tsx` - Added import, state, helper function, and component integration
- `/frontend/components/TrendValueSelector.tsx` - New component (created)

## Future Enhancements
- Could add ability to save user preference to localStorage
- Could allow selecting different modes for different search contexts
- Could add tooltips explaining each mode in detail
- Could add keyboard shortcuts to switch modes quickly
