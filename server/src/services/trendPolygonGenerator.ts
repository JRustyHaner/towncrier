import { TrendAnalysis } from './googleTrendsFetcher.js';

export interface TrendPolygon {
  id: string;
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: Array<Array<[number, number]>>;
  };
  properties: {
    timeRange: {
      start: string;
      end: string;
    };
    intensity: number;
    intensityPercentage: number;
    phase: string;
    color: string;
    opacity: number;
    tooltip: string;
  };
}

export interface TrendVisualization {
  keyword: string;
  polygons: TrendPolygon[];
  timelineHeatmap: Array<{
    time: string;
    timestamp: number;
    intensity: number;
    color: string;
  }>;
  statistics: {
    peakIntensity: number;
    peakDate: string;
    trendDeathDate: string | null;
    lifespanDays: number;
    avgIntensity: number;
  };
}

/**
 * Generate color based on intensity (0-100)
 * Uses a heatmap color scale: cool to hot
 */
export function getColorForIntensity(intensity: number): string {
  intensity = Math.max(0, Math.min(100, intensity));

  if (intensity < 20) {
    // Cool colors: blue to cyan
    const ratio = intensity / 20;
    return `#0047AB`; // Blue
  } else if (intensity < 40) {
    // Cyan to green
    return `#00B4D8`;
  } else if (intensity < 60) {
    // Green to yellow
    return `#7FFF00`;
  } else if (intensity < 80) {
    // Yellow to orange
    return `#FFA500`;
  } else {
    // Orange to red
    return `#FF4500`;
  }
}

/**
 * Generate time-based geographic polygons representing trend intensity over time
 * Creates concentric rectangles or expanding areas based on time progression
 */
export function generateTrendPolygons(analysis: TrendAnalysis, centerLat: number = 39.8, centerLng: number = -98.5): TrendVisualization {
  const timelineData = analysis.timelineData;
  if (timelineData.length === 0) {
    return {
      keyword: analysis.keyword,
      polygons: [],
      timelineHeatmap: [],
      statistics: {
        peakIntensity: 0,
        peakDate: new Date().toISOString(),
        trendDeathDate: null,
        lifespanDays: 0,
        avgIntensity: 0
      }
    };
  }

  const polygons: TrendPolygon[] = [];
  const timelineHeatmap: Array<any> = [];

  const totalTimeSpan = timelineData.length;
  const avgIntensity = Math.round(
    timelineData.reduce((sum, point) => sum + point.value, 0) / timelineData.length
  );

  // Create polygons for major trend phases (every 20% of timeline or every significant change)
  const segmentSize = Math.max(1, Math.floor(totalTimeSpan / 5));

  for (let i = 0; i < timelineData.length; i += segmentSize) {
    const startIdx = i;
    const endIdx = Math.min(i + segmentSize, timelineData.length - 1);

    const startPoint = timelineData[startIdx];
    const endPoint = timelineData[endIdx];

    // Calculate average intensity for this segment
    let segmentIntensity = 0;
    let pointCount = 0;
    for (let j = startIdx; j <= endIdx; j++) {
      segmentIntensity += timelineData[j].value;
      pointCount++;
    }
    segmentIntensity = Math.round(segmentIntensity / pointCount);

    // Create expanding polygon based on time progression
    const timeProgress = (startIdx / totalTimeSpan);
    const baseRadius = 2; // Base radius in degrees
    const expandedRadius = baseRadius * (1 + timeProgress * 2); // Expands over time

    // Calculate opacity based on intensity
    const opacity = Math.max(0.2, Math.min(0.8, segmentIntensity / 100));

    // Create polygon coordinates (rectangle expanding outward)
    const polygon = createExpandingPolygon(
      centerLat,
      centerLng,
      expandedRadius,
      segmentIntensity,
      timeProgress
    );

    const color = getColorForIntensity(segmentIntensity);

    const startDate = new Date(startPoint.timestamp);
    const endDate = new Date(endPoint.timestamp);

    polygons.push({
      id: `polygon-${i}`,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: polygon
      },
      properties: {
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        intensity: segmentIntensity,
        intensityPercentage: Math.round((segmentIntensity / analysis.peakValue) * 100),
        phase: getPhaseLabel(startIdx, totalTimeSpan, segmentIntensity, analysis.peakValue),
        color,
        opacity,
        tooltip: `${analysis.keyword} - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}<br>Intensity: ${segmentIntensity}%`
      }
    });
  }

  // Create timeline heatmap data
  for (const point of timelineData) {
    const color = getColorForIntensity(point.value);
    timelineHeatmap.push({
      time: point.formattedTime,
      timestamp: point.timestamp,
      intensity: point.value,
      color
    });
  }

  const lifespanDays = Math.floor(
    (timelineData[timelineData.length - 1].timestamp - timelineData[0].timestamp) / (24 * 60 * 60 * 1000)
  );

  return {
    keyword: analysis.keyword,
    polygons,
    timelineHeatmap,
    statistics: {
      peakIntensity: analysis.peakValue,
      peakDate: analysis.peakTime,
      trendDeathDate: analysis.trendDeathTime?.toISOString() || null,
      lifespanDays,
      avgIntensity
    }
  };
}

/**
 * Create an expanding polygon that grows outward representing time progression
 */
function createExpandingPolygon(
  centerLat: number,
  centerLng: number,
  radius: number,
  intensity: number,
  timeProgress: number
): Array<Array<[number, number]>> {
  // Create a rectangle/polygon that expands outward
  const vertices = 8; // Number of points in the polygon

  const points: Array<[number, number]> = [];

  for (let i = 0; i < vertices; i++) {
    const angle = (i / vertices) * 2 * Math.PI;
    const variableRadius = radius * (0.8 + intensity / 100 * 0.4); // Varies with intensity

    const lat = centerLat + variableRadius * Math.cos(angle);
    const lng = centerLng + variableRadius * Math.sin(angle);

    points.push([lng, lat]);
  }

  // Close the polygon
  points.push(points[0]);

  return [points];
}

/**
 * Determine the phase label based on position in timeline and intensity
 */
function getPhaseLabel(
  index: number,
  total: number,
  intensity: number,
  peakValue: number
): string {
  const progress = index / total;
  const intensityRatio = intensity / peakValue;

  if (progress < 0.2) {
    return 'emergence';
  } else if (progress < 0.4) {
    if (intensityRatio > 0.7) return 'rapid-growth';
    return 'growth';
  } else if (progress < 0.6) {
    if (intensityRatio > 0.8) return 'peak';
    return 'sustained-peak';
  } else if (progress < 0.8) {
    return 'decline';
  } else {
    return 'death';
  }
}

/**
 * Generate heatmap layers for specific time windows
 * Useful for animation or granular visualization
 */
export function generateTimeWindowHeatmap(
  analysis: TrendAnalysis,
  windowSizeDays: number = 7,
  centerLat: number = 39.8,
  centerLng: number = -98.5
): Array<{
  window: { start: string; end: string };
  polygons: TrendPolygon[];
}> {
  const timelineData = analysis.timelineData;
  const results: Array<any> = [];

  const startTime = timelineData[0].timestamp;
  const endTime = timelineData[timelineData.length - 1].timestamp;
  const windowMs = windowSizeDays * 24 * 60 * 60 * 1000;

  let currentWindow = startTime;

  while (currentWindow < endTime) {
    const windowEnd = Math.min(currentWindow + windowMs, endTime);
    const windowPoints = timelineData.filter(
      p => p.timestamp >= currentWindow && p.timestamp < windowEnd
    );

    if (windowPoints.length > 0) {
      const avgIntensity = Math.round(
        windowPoints.reduce((sum, p) => sum + p.value, 0) / windowPoints.length
      );

      const polygon: TrendPolygon = {
        id: `window-${currentWindow}`,
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: createExpandingPolygon(
            centerLat,
            centerLng,
            2 * (avgIntensity / 100),
            avgIntensity,
            (currentWindow - startTime) / (endTime - startTime)
          )
        },
        properties: {
          timeRange: {
            start: new Date(currentWindow).toISOString(),
            end: new Date(windowEnd).toISOString()
          },
          intensity: avgIntensity,
          intensityPercentage: Math.round((avgIntensity / analysis.peakValue) * 100),
          phase: getPhaseLabel(
            (currentWindow - startTime) / (endTime - startTime) * 100,
            100,
            avgIntensity,
            analysis.peakValue
          ),
          color: getColorForIntensity(avgIntensity),
          opacity: Math.max(0.2, Math.min(0.8, avgIntensity / 100)),
          tooltip: `${analysis.keyword} - ${new Date(currentWindow).toLocaleDateString()}<br>Intensity: ${avgIntensity}%`
        }
      };

      results.push({
        window: {
          start: new Date(currentWindow).toISOString(),
          end: new Date(windowEnd).toISOString()
        },
        polygons: [polygon]
      });
    }

    currentWindow += windowMs;
  }

  return results;
}
