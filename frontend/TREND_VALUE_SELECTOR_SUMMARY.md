# Trend Value Selector - What Was Added

## Answer to Your Question

**No, the frontend did NOT have a dropdown for selecting trend value metrics.** It was hardcoded to always use the maximum value. **I just added it.**

## What's New

### The UI Component
A new `TrendValueSelector` component that appears above the map with:

```
┌─────────────────────────────────────────────────────┐
│  📊 Maximum    ▼                                     │
│     Trend Fill Opacity                              │
└─────────────────────────────────────────────────────┘
```

Clicking opens a dropdown:

```
┌───────────────────────────────────────────────�┐
│ Trend Value Mode                              │
│ Choose how to calculate marker opacity        │
├───────────────────────────────────────────────┤
│ ⬆️ Maximum                                     │
│ Highest trend value among all terms        ✓ │
│                                               │
│ ⬇️ Minimum                                     │
│ Lowest trend value among all terms           │
│                                               │
│ 📊 Average                                     │
│ Mean trend value across all terms            │
│                                               │
│ 🔍 Primary Term                                │
│ Only the main search term                     │
└───────────────────────────────────────────────┘
```

## How It Works

### Before (Old Behavior)
```typescript
// Hardcoded to always use max
const trendValue = Math.max(mainValue, ...phraseValues);
```

### After (New Behavior)
```typescript
// User can select mode
const trendValue = calculateTrendValue(mainValue, phraseValues);
// Returns max, min, average, or primary based on user selection
```

## The 4 Modes

| Mode | Formula | Use Case |
|------|---------|----------|
| **Maximum** | max(all_terms) | Show when ANY related term is trending |
| **Minimum** | min(all_terms) | Conservative representation |
| **Average** | mean(all_terms) | Balanced view of trend activity |
| **Primary** | main_term_only | Focus only on main search keyword |

## Real Example

Search for "election"

**With Maximum Mode:**
- Main term: 45
- Related phrases: "election results" (78), "election fraud" (62)
- **Marker opacity = 78/100 = 78%** (very opaque, highlights the spike)

**With Average Mode:**
- Values: 45, 78, 62
- **Marker opacity = (45+78+62)/3 = 61.7%** (moderate opacity)

**With Primary Mode:**
- Only uses main term: 45
- **Marker opacity = 45/100 = 45%** (more transparent)

**With Minimum Mode:**
- Values: 45, 78, 62
- **Marker opacity = 45/100 = 45%** (conservative)

## Technical Implementation

1. **New Component:** `TrendValueSelector.tsx` with TypeScript type `TrendValueMode`
2. **New State:** `trendValueMode` in App.tsx
3. **New Function:** `calculateTrendValue()` that switches between modes
4. **Integration:** Component rendered above MapView in the map tab

## User Flow

1. User searches for articles
2. Map displays with trend markers
3. User clicks TrendValueSelector button
4. User chooses from 4 modes
5. **Map immediately updates** with new opacities
6. Each article marker recalculates based on chosen mode

## What Changed

**Files Modified:**
- `App.tsx` - Added import, state hook, helper function, component integration
- `components/TrendValueSelector.tsx` - New UI component

**No Backend Changes Needed** - All calculation happens on the frontend with existing data

## Benefits

✅ Users can explore different trend representations  
✅ More control over data visualization  
✅ Better matches the map encoding specification (user-selectable trend metrics)  
✅ Dynamic updates without server round-trip  
✅ Accessible with dark mode support  
