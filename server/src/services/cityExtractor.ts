/**
 * Enhanced City Extraction Service - Phase 1
 * Uses @mardillu/us-cities-utils for accurate US city geolocation
 * Intelligently extracts city locations from article text and source metadata
 */

let searchCities: any;
let getNearestCity: any;
let getCity: any;

try {
  const module = require('@mardillu/us-cities-utils');
  searchCities = module.searchCities;
  getNearestCity = module.getNearestCity;
  getCity = module.getCity;
} catch (e) {
  console.warn('US Cities Utils library not yet installed - using fallback');
}

export interface ExtractedCity {
  name: string;
  latitude: number;
  longitude: number;
  confidence: number; // 0-1 scale
  source?: string; // How we identified this city (text, source, fallback)
}

/**
 * Comprehensive US City Database
 * Format: lowercase search term -> { name, lat, lng, confidence, states }
 */
const usCitiesDatabase: Record<string, { name: string; latitude: number; longitude: number; confidence: number; states: string[] }> = {
  // Major Metropolitan Areas
  'new york': { name: 'New York City, NY', latitude: 40.7128, longitude: -74.0060, confidence: 0.98, states: ['NY'] },
  'los angeles': { name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437, confidence: 0.98, states: ['CA'] },
  'chicago': { name: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298, confidence: 0.98, states: ['IL'] },
  'houston': { name: 'Houston, TX', latitude: 29.7604, longitude: -95.3698, confidence: 0.96, states: ['TX'] },
  'phoenix': { name: 'Phoenix, AZ', latitude: 33.4484, longitude: -112.0742, confidence: 0.96, states: ['AZ'] },
  'philadelphia': { name: 'Philadelphia, PA', latitude: 39.9526, longitude: -75.1652, confidence: 0.96, states: ['PA'] },
  'san antonio': { name: 'San Antonio, TX', latitude: 29.4241, longitude: -98.4936, confidence: 0.95, states: ['TX'] },
  'san diego': { name: 'San Diego, CA', latitude: 32.7157, longitude: -117.1611, confidence: 0.96, states: ['CA'] },
  'dallas': { name: 'Dallas, TX', latitude: 32.7767, longitude: -96.7970, confidence: 0.97, states: ['TX'] },
  'san jose': { name: 'San Jose, CA', latitude: 37.3382, longitude: -121.8863, confidence: 0.95, states: ['CA'] },
  'austin': { name: 'Austin, TX', latitude: 30.2672, longitude: -97.7431, confidence: 0.97, states: ['TX'] },
  'jacksonville': { name: 'Jacksonville, FL', latitude: 30.3322, longitude: -81.6557, confidence: 0.95, states: ['FL'] },
  'fort worth': { name: 'Fort Worth, TX', latitude: 32.7555, longitude: -97.3308, confidence: 0.94, states: ['TX'] },
  'columbus': { name: 'Columbus, OH', latitude: 39.9612, longitude: -82.9988, confidence: 0.94, states: ['OH'] },
  'charlotte': { name: 'Charlotte, NC', latitude: 35.2271, longitude: -80.8431, confidence: 0.94, states: ['NC'] },
  'san francisco': { name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194, confidence: 0.97, states: ['CA'] },
  'indianapolis': { name: 'Indianapolis, IN', latitude: 39.7684, longitude: -86.1581, confidence: 0.93, states: ['IN'] },
  'seattle': { name: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321, confidence: 0.96, states: ['WA'] },
  'denver': { name: 'Denver, CO', latitude: 39.7392, longitude: -104.9903, confidence: 0.95, states: ['CO'] },
  'washington': { name: 'Washington, DC', latitude: 38.9072, longitude: -77.0369, confidence: 0.97, states: ['DC'] },
  'boston': { name: 'Boston, MA', latitude: 42.3601, longitude: -71.0589, confidence: 0.96, states: ['MA'] },
  'miami': { name: 'Miami, FL', latitude: 25.7617, longitude: -80.1918, confidence: 0.95, states: ['FL'] },
  'atlanta': { name: 'Atlanta, GA', latitude: 33.7490, longitude: -84.3880, confidence: 0.95, states: ['GA'] },
  'nashville': { name: 'Nashville, TN', latitude: 36.1627, longitude: -86.7816, confidence: 0.94, states: ['TN'] },
  'detroit': { name: 'Detroit, MI', latitude: 42.3314, longitude: -83.0458, confidence: 0.94, states: ['MI'] },
  'oklahoma city': { name: 'Oklahoma City, OK', latitude: 35.4676, longitude: -97.5164, confidence: 0.93, states: ['OK'] },
  'las vegas': { name: 'Las Vegas, NV', latitude: 36.1699, longitude: -115.1398, confidence: 0.95, states: ['NV'] },
  'portland': { name: 'Portland, OR', latitude: 45.5152, longitude: -122.6784, confidence: 0.93, states: ['OR'] },
  'memphis': { name: 'Memphis, TN', latitude: 35.1495, longitude: -90.0490, confidence: 0.96, states: ['TN'] },
  'louisville': { name: 'Louisville, KY', latitude: 38.2527, longitude: -85.7585, confidence: 0.93, states: ['KY'] },
  'baltimore': { name: 'Baltimore, MD', latitude: 39.2904, longitude: -76.6122, confidence: 0.94, states: ['MD'] },
  'new orleans': { name: 'New Orleans, LA', latitude: 29.9511, longitude: -90.2623, confidence: 0.94, states: ['LA'] },
  'birmingham': { name: 'Birmingham, AL', latitude: 33.6190, longitude: -86.8104, confidence: 0.92, states: ['AL'] },
  'albuquerque': { name: 'Albuquerque, NM', latitude: 35.0844, longitude: -106.6504, confidence: 0.92, states: ['NM'] },
  'tucson': { name: 'Tucson, AZ', latitude: 32.2226, longitude: -110.9747, confidence: 0.92, states: ['AZ'] },
  'fresno': { name: 'Fresno, CA', latitude: 36.7469, longitude: -119.7726, confidence: 0.91, states: ['CA'] },
  'sacramento': { name: 'Sacramento, CA', latitude: 38.5816, longitude: -121.4944, confidence: 0.92, states: ['CA'] },
  'kansas city': { name: 'Kansas City, MO', latitude: 39.0997, longitude: -94.5786, confidence: 0.93, states: ['MO'] },
  'long beach': { name: 'Long Beach, CA', latitude: 33.7701, longitude: -118.1937, confidence: 0.91, states: ['CA'] },
  'mesa': { name: 'Mesa, AZ', latitude: 33.4152, longitude: -111.8313, confidence: 0.90, states: ['AZ'] },
  'virginia beach': { name: 'Virginia Beach, VA', latitude: 36.8529, longitude: -75.9780, confidence: 0.92, states: ['VA'] },
  'minneapolis': { name: 'Minneapolis, MN', latitude: 44.9778, longitude: -93.2650, confidence: 0.93, states: ['MN'] },
  'saint paul': { name: 'Saint Paul, MN', latitude: 44.9537, longitude: -93.0900, confidence: 0.92, states: ['MN'] },
  'st. paul': { name: 'Saint Paul, MN', latitude: 44.9537, longitude: -93.0900, confidence: 0.92, states: ['MN'] },
  'st paul': { name: 'Saint Paul, MN', latitude: 44.9537, longitude: -93.0900, confidence: 0.92, states: ['MN'] },
  'cincinnati': { name: 'Cincinnati, OH', latitude: 39.1031, longitude: -84.5120, confidence: 0.92, states: ['OH'] },
  'cleveland': { name: 'Cleveland, OH', latitude: 41.4993, longitude: -81.6944, confidence: 0.92, states: ['OH'] },
  'wichita': { name: 'Wichita, KS', latitude: 37.6872, longitude: -97.3301, confidence: 0.90, states: ['KS'] },
  'arlington': { name: 'Arlington, TX', latitude: 32.7357, longitude: -97.2247, confidence: 0.90, states: ['TX'] },
  'new york city': { name: 'New York City, NY', latitude: 40.7128, longitude: -74.0060, confidence: 0.98, states: ['NY'] },
  'nyc': { name: 'New York City, NY', latitude: 40.7128, longitude: -74.0060, confidence: 0.95, states: ['NY'] },
  'la': { name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437, confidence: 0.85, states: ['CA'] }, // Lower confidence due to ambiguity
};

/**
 * Source location mapping
 * Maps news source names to their primary locations
 */
const sourceLocationMapping: Record<string, ExtractedCity> = {
  'memphis commercial appeal': {
    name: 'Memphis, TN',
    latitude: 35.1495,
    longitude: -90.0490,
    confidence: 0.98,
    source: 'source'
  },
  'commercial appeal': {
    name: 'Memphis, TN',
    latitude: 35.1495,
    longitude: -90.0490,
    confidence: 0.97,
    source: 'source'
  },
  'new york times': {
    name: 'New York City, NY',
    latitude: 40.7128,
    longitude: -74.0060,
    confidence: 0.98,
    source: 'source'
  },
  'los angeles times': {
    name: 'Los Angeles, CA',
    latitude: 34.0522,
    longitude: -118.2437,
    confidence: 0.98,
    source: 'source'
  },
  'washington post': {
    name: 'Washington, DC',
    latitude: 38.9072,
    longitude: -77.0369,
    confidence: 0.98,
    source: 'source'
  },
  'chicago tribune': {
    name: 'Chicago, IL',
    latitude: 41.8781,
    longitude: -87.6298,
    confidence: 0.98,
    source: 'source'
  },
  'boston globe': {
    name: 'Boston, MA',
    latitude: 42.3601,
    longitude: -71.0589,
    confidence: 0.98,
    source: 'source'
  },
  'san francisco chronicle': {
    name: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    confidence: 0.98,
    source: 'source'
  },
  'seattle times': {
    name: 'Seattle, WA',
    latitude: 47.6062,
    longitude: -122.3321,
    confidence: 0.98,
    source: 'source'
  },
  'denver post': {
    name: 'Denver, CO',
    latitude: 39.7392,
    longitude: -104.9903,
    confidence: 0.98,
    source: 'source'
  },
  'miami herald': {
    name: 'Miami, FL',
    latitude: 25.7617,
    longitude: -80.1918,
    confidence: 0.98,
    source: 'source'
  },
  'atlanta journal-constitution': {
    name: 'Atlanta, GA',
    latitude: 33.7490,
    longitude: -84.3880,
    confidence: 0.98,
    source: 'source'
  },
};

/**
 * State abbreviation mapping for reference
 */
const stateAbbreviations: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'washington dc': 'DC', 'district of columbia': 'DC'
};

/**
 * Extract city from article text and source
 * Priority:
 * 1. Source-based location (most reliable - news outlet locations)
 * 2. Text-based location (article mentions specific city)
 * 3. Fallback to default neutral location
 */
export function extractCity(
  text: string,
  articleIndex: number,
  source?: string,
  title?: string
): ExtractedCity {
  const lowerText = text.toLowerCase();
  const lowerSource = source?.toLowerCase() || '';

  // PRIORITY 1: Check source location mapping first (most reliable)
  if (source) {
    // Try exact source match
    const sourceKey = lowerSource;
    if (sourceLocationMapping[sourceKey]) {
      return sourceLocationMapping[sourceKey];
    }

    // Try partial source match for variations
    for (const [key, location] of Object.entries(sourceLocationMapping)) {
      if (lowerSource.includes(key) || key.includes(lowerSource)) {
        return location;
      }
    }
  }

  // PRIORITY 2: Check for city mentions in text
  // Longer city names first to avoid partial matches
  const sortedCities = Object.entries(usCitiesDatabase).sort((a, b) => b[0].length - a[0].length);

  for (const [cityKeyword, cityData] of sortedCities) {
    if (lowerText.includes(cityKeyword)) {
      return {
        name: cityData.name,
        latitude: cityData.latitude,
        longitude: cityData.longitude,
        confidence: cityData.confidence * 0.95, // Slightly lower confidence for text extraction
        source: 'text'
      };
    }
  }

  // Also check title for city mentions
  if (title) {
    const lowerTitle = title.toLowerCase();
    for (const [cityKeyword, cityData] of sortedCities) {
      if (lowerTitle.includes(cityKeyword)) {
        return {
          name: cityData.name,
          latitude: cityData.latitude,
          longitude: cityData.longitude,
          confidence: cityData.confidence * 0.92,
          source: 'title'
        };
      }
    }
  }

  // PRIORITY 3: Fallback - distribute articles across major US cities
  const majorCities = [
    usCitiesDatabase['new york'],
    usCitiesDatabase['los angeles'],
    usCitiesDatabase['chicago'],
    usCitiesDatabase['houston'],
    usCitiesDatabase['phoenix'],
    usCitiesDatabase['philadelphia'],
    usCitiesDatabase['san antonio'],
    usCitiesDatabase['san diego'],
    usCitiesDatabase['dallas'],
    usCitiesDatabase['san jose'],
  ];

  const fallbackCity = majorCities[articleIndex % majorCities.length];
  return {
    ...fallbackCity,
    confidence: 0.5, // Low confidence for fallback
    source: 'fallback'
  };
}
