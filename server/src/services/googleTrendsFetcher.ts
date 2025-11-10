// @ts-nocheck
import { fetchTrendsFromHtml } from './googleTrendsHtmlFetcher.js';

export interface TrendDataPoint {
  time: string;
  formattedTime: string;
  value: number;
  timestamp: number;
}

export interface TrendAnalysis {
  keyword: string;
  startTime: Date;
  endTime: Date;
  peakValue: number;
  peakTime: string;
  firstArticleTime: Date;
  trendDeathTime: Date | null;
  timeToDeathDays: number | null;
  trendIntensityScore: number;
  timelineData: TrendDataPoint[];
  regions: Array<{
    region: string;
    value: number;
    coordinates?: { lat: number; lng: number };
  }>;
}

/**
 * Fetches Google Trends data for a given keyword and analyzes trend lifecycle
 */
export async function fetchTrendData(
  keyword: string,
  startTime?: Date,
  endTime?: Date,
  geo?: string
): Promise<TrendAnalysis> {
  try {
    // Set date range from first article to now, or fallback to last 90 days
    const start = startTime || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endTime || new Date();
    // Format date for Google Trends URL: YYYY-MM-DDTHH
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}`;
    const dateRange = `${fmt(start)}%20${fmt(end)}`;
    const geoCode = geo || 'US';
    // Fetch and parse trends data from HTML
    const trendsJson = await fetchTrendsFromHtml({
      keyword,
      dateRange,
      geo: geoCode,
      hl: 'en'
    });
    // Parse timeline data (interest over time)
    const timelinePoints = trendsJson?.widgets?.find((w: any) => w.id === 'TIMESERIES')?.data?.timelineData || [];
    const trendPoints: TrendDataPoint[] = timelinePoints.map((point: any) => ({
      time: point.time,
      formattedTime: point.formattedTime,
      value: point.value[0],
      timestamp: parseInt(point.time) * 1000
    }));
    // Find peak value
    const peakPoint = trendPoints.reduce((max, current) =>
      current.value > max.value ? current : max,
      trendPoints[0] || { value: 0 }
    );
    // Analyze trend death (when trend drops below 10% of peak and stays there)
    let trendDeathTime: Date | null = null;
    const deathThreshold = peakPoint.value * 0.1;
    for (let i = Math.floor(trendPoints.length * 0.7); i < trendPoints.length; i++) {
      if (trendPoints[i].value <= deathThreshold) {
        trendDeathTime = new Date(trendPoints[i].timestamp);
        break;
      }
    }
    const timeToDeathDays = trendDeathTime
      ? Math.floor((trendDeathTime.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    // Calculate intensity score (0-100)
    const intensityScore = Math.min(100, Math.round(peakPoint.value));
    // Parse regional data if available
    let regions: Array<{ region: string; value: number; coordinates?: { lat: number; lng: number } }> = [];
    const regionWidget = trendsJson?.widgets?.find((w: any) => w.id === 'GEO_MAP');
    if (regionWidget?.data?.geoMapData) {
      regions = regionWidget.data.geoMapData.map((region: any) => ({
        region: region.geoName || 'Unknown',
        value: region.value[0],
        coordinates: region.coordinates
      }));
    }
    return {
      keyword,
      startTime: start,
      endTime: end,
      peakValue: peakPoint.value,
      peakTime: peakPoint.formattedTime,
      firstArticleTime: start,
      trendDeathTime,
      timeToDeathDays,
      trendIntensityScore: intensityScore,
      timelineData: trendPoints,
      regions
    };
  } catch (error) {
    console.error(`Error fetching trends for "${keyword}":`, error);
    throw new Error(`Failed to fetch trend data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches trends for multiple keywords and compares them
 */
export async function compareTrends(
  keywords: string[],
  startTime?: Date,
  endTime?: Date,
  geo?: string
): Promise<TrendAnalysis[]> {
  const trendPromises = keywords.map(keyword =>
    fetchTrendData(keyword, startTime, endTime, geo).catch(error => {
      console.error(`Error fetching trend for ${keyword}:`, error);
      return null;
    })
  );

  const results = await Promise.all(trendPromises);
  return results.filter((result): result is TrendAnalysis => result !== null);
}

/**
 * Analyzes how long it takes for a trend to "die down"
 * Returns phases of the trend lifecycle
 */
export function analyzeTrendPhases(analysis: TrendAnalysis): Array<{
  phase: 'emergence' | 'growth' | 'peak' | 'decline' | 'death';
  startTime: Date;
  endTime: Date;
  intensity: number;
  durationDays: number;
}> {
  const timelineData = analysis.timelineData;
  if (timelineData.length === 0) return [];

  const peakValue = analysis.peakValue;
  const phases: Array<any> = [];

  let currentPhase: any = null;
  let phaseStartIdx = 0;

  for (let i = 0; i < timelineData.length; i++) {
    const value = timelineData[i].value;
    const timestamp = new Date(timelineData[i].timestamp);
    let newPhase: string | null = null;

    if (value <= peakValue * 0.1) {
      newPhase = i > timelineData.length * 0.7 ? 'death' : 'emergence';
    } else if (value >= peakValue * 0.9) {
      newPhase = 'peak';
    } else if (value < currentPhase?.value || 0) {
      newPhase = 'decline';
    } else {
      newPhase = 'growth';
    }

    if (!currentPhase || newPhase !== currentPhase.phase) {
      if (currentPhase) {
        const startTime = new Date(timelineData[phaseStartIdx].timestamp);
        const endTime = new Date(timelineData[i - 1].timestamp);
        const durationDays = Math.floor((endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000));

        phases.push({
          phase: currentPhase.phase,
          startTime,
          endTime,
          intensity: currentPhase.avgValue,
          durationDays
        });
      }

      currentPhase = { phase: newPhase, value, avgValue: value, count: 1 };
      phaseStartIdx = i;
    } else {
      currentPhase.value = value;
      currentPhase.avgValue = (currentPhase.avgValue * currentPhase.count + value) / (currentPhase.count + 1);
      currentPhase.count++;
    }
  }

  // Add final phase
  if (currentPhase && phaseStartIdx < timelineData.length) {
    const startTime = new Date(timelineData[phaseStartIdx].timestamp);
    const endTime = new Date(timelineData[timelineData.length - 1].timestamp);
    const durationDays = Math.floor((endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000));

    phases.push({
      phase: currentPhase.phase,
      startTime,
      endTime,
      intensity: currentPhase.avgValue,
      durationDays
    });
  }

  return phases;
}
