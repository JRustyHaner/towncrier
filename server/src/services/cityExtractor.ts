/**
 * City Extraction Stub - Phase 0 Demonstrator
 * Uses fake lat/lng for mock articles
 */

export interface ExtractedCity {
  name: string;
  latitude: number;
  longitude: number;
  confidence: number; // 0-1 scale
}

// Mock city locations for Phase 0
const mockCities: Record<string, ExtractedCity> = {
  'new york': {
    name: 'New York City, NY',
    latitude: 40.7128,
    longitude: -74.0060,
    confidence: 0.95
  },
  'washington': {
    name: 'Washington, DC',
    latitude: 38.9072,
    longitude: -77.0369,
    confidence: 0.90
  },
  'los angeles': {
    name: 'Los Angeles, CA',
    latitude: 34.0522,
    longitude: -118.2437,
    confidence: 0.92
  },
  'chicago': {
    name: 'Chicago, IL',
    latitude: 41.8781,
    longitude: -87.6298,
    confidence: 0.91
  },
  'boston': {
    name: 'Boston, MA',
    latitude: 42.3601,
    longitude: -71.0589,
    confidence: 0.88
  },
  'san francisco': {
    name: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    confidence: 0.89
  },
  'denver': {
    name: 'Denver, CO',
    latitude: 39.7392,
    longitude: -104.9903,
    confidence: 0.87
  },
  'seattle': {
    name: 'Seattle, WA',
    latitude: 47.6062,
    longitude: -122.3321,
    confidence: 0.86
  },
  'miami': {
    name: 'Miami, FL',
    latitude: 25.7617,
    longitude: -80.1918,
    confidence: 0.85
  },
  'atlanta': {
    name: 'Atlanta, GA',
    latitude: 33.7490,
    longitude: -84.3880,
    confidence: 0.84
  }
};

/**
 * Extract city from article text (stub implementation)
 * For Phase 0, returns mock cities in round-robin fashion
 */
export function extractCity(text: string, articleIndex: number): ExtractedCity {
  const lowerText = text.toLowerCase();
  
  // Check for known city keywords
  for (const [keyword, city] of Object.entries(mockCities)) {
    if (lowerText.includes(keyword)) {
      return city;
    }
  }
  
  // Fallback: cycle through mock cities
  const cities = Object.values(mockCities);
  return cities[articleIndex % cities.length];
}
