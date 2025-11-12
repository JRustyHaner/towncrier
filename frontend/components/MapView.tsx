import React, { useEffect, useRef, useState } from 'react';
import { fetchGoogleTrends, GoogleTrend } from '../api/googleTrends';
import { View, StyleSheet, ScrollView, Text } from 'react-native';

interface MapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  status: string;
  color: string;
  source?: string;
  city?: string;
  link?: string; // URL to the article
  sentiment?: { score: number; comparative: number; };
  sentimentLabel?: string;
  trendValue?: number;
  trendTerms?: Array<{ term: string; value: number }>;
  publishDate?: string;
  valence?: number; // -1 to 1, red (negative) to grey (neutral) to blue (positive)
  category?: 'retraction' | 'correction' | 'news-article' | 'biased-source' | 'untruthful-source';
  bias?: number; // bias rating from CSV (-30 to 30)
  factualReporting?: 'MIXED' | 'HIGH' | 'VERY_HIGH'; // factual reporting rating
  firstArticleTime?: number; // timestamp of first article at this location
}

interface TrendPolygon {
  id: string;
  geometry: {
    type: 'Polygon';
    coordinates: Array<Array<[number, number]>>;
  };
  properties: {
    timeRange: { start: string; end: string };
    intensity: number;
    intensityPercentage: number;
    phase: string;
    color: string;
    opacity: number;
    tooltip: string;
  };
}

interface MapProps {
  markers: MapMarker[];
  trendPolygons?: TrendPolygon[];
  onMarkerPress?: (marker: MapMarker) => void;
  isDark?: boolean;
}

export default function MapView({ markers, trendPolygons = [], onMarkerPress, isDark }: MapProps) {
  const [mapHtml, setMapHtml] = useState<string>('');
  const [trendMarkers, setTrendMarkers] = useState<GoogleTrend[]>([]);

  // Fetch Google Trends for the first marker's title (as a demo)
  useEffect(() => {
    if (markers.length > 0) {
      const query = markers[0].title;
      fetchGoogleTrends({ query, geo: 'US', dateRange: 'now 7-d' })
        .then(setTrendMarkers)
        .catch(() => setTrendMarkers([]));
    } else {
      setTrendMarkers([]);
    }
  }, [markers]);

  useEffect(() => {
    // Merge article markers and trend markers (trend markers shown as blue dots)
    const allMarkers = [
      ...markers,
      ...trendMarkers.map((trend, i) => ({
        id: `trend-${i}`,
        title: `Trend: ${trend.title} (${trend.date})`,
        latitude: markers[0]?.latitude || 39.8, // fallback to US center
        longitude: markers[0]?.longitude || -98.5,
        status: 'trend',
        color: '#137fec'
      }))
    ];
    if (allMarkers.length > 0 || trendPolygons.length > 0) {
      // Create HTML for Leaflet map with clustering and trend polygons
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
          <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"><\/script>
          <style>
            * { margin: 0; padding: 0; }
            body { ${isDark ? 'background: #101922; color: #f8fafc;' : 'background: #f6f7f8; color: #0f172a;'} height: 100vh; }
            html { height: 100%; }
            #map { height: 100%; width: 100%; }
            .marker-cluster-small { background-color: rgba(181, 226, 140, 0.6); }
            .marker-cluster-small div { background-color: rgba(110, 204, 57, 0.6); }
            .marker-cluster-medium { background-color: rgba(241, 211, 87, 0.6); }
            .marker-cluster-medium div { background-color: rgba(240, 194, 12, 0.6); }
            .marker-cluster-large { background-color: rgba(253, 156, 115, 0.6); }
            .marker-cluster-large div { background-color: rgba(241, 128, 23, 0.6); }
            .trend-legend {
              position: absolute;
              bottom: 10px;
              right: 10px;
              background: white;
              padding: 10px;
              border-radius: 5px;
              box-shadow: 0 0 15px rgba(0,0,0,0.2);
              z-index: 1000;
              font-size: 12px;
              max-width: 250px;
            }
            .trend-legend-item {
              display: flex;
              align-items: center;
              margin-bottom: 5px;
            }
            .trend-legend-color {
              width: 20px;
              height: 20px;
              margin-right: 8px;
              border: 1px solid #ccc;
            }
            .legend-section {
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #ccc;
            }
            .legend-section:last-child {
              border-bottom: none;
            }
            .legend-title {
              font-weight: bold;
              font-size: 11px;
              margin-bottom: 4px;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="trend-legend" class="trend-legend" style="display: block;">
            <div class="legend-section">
              <div class="legend-title">Fill Color (Valence)</div>
              <div class="trend-legend-item">
                <div class="trend-legend-color" style="background-color: #ff3b3b;"></div>
                <span>Negative (-1)</span>
              </div>
              <div class="trend-legend-item">
                <div class="trend-legend-color" style="background-color: #9ca3af;"></div>
                <span>Neutral (0)</span>
              </div>
              <div class="trend-legend-item">
                <div class="trend-legend-color" style="background-color: #3b82f6;"></div>
                <span>Positive (+1)</span>
              </div>
            </div>
            <div class="legend-section">
              <div class="legend-title">Border Color (Category)</div>
              <div class="trend-legend-item">
                <div class="trend-legend-color" style="background-color: #d32f2f; border: 2px solid #d32f2f;"></div>
                <span>Retraction</span>
              </div>
              <div class="trend-legend-item">
                <div class="trend-legend-color" style="background-color: #f57c00; border: 2px solid #f57c00;"></div>
                <span>Correction</span>
              </div>
              <div class="trend-legend-item">
                <div class="trend-legend-color" style="background-color: #1976d2; border: 2px solid #1976d2;"></div>
                <span>Original</span>
              </div>
              <div class="trend-legend-item">
                <div class="trend-legend-color" style="background-color: #f9a825; border: 2px solid #f9a825;"></div>
                <span>Disputed</span>
              </div>
              <div class="trend-legend-item">
                <div class="trend-legend-color" style="background-color: #7b1fa2; border: 2px solid #7b1fa2;"></div>
                <span>Misleading</span>
              </div>
            </div>
            <div class="legend-section">
              <div class="legend-title">Encoding</div>
              <div style="font-size: 10px; line-height: 1.4;">
                <strong>Size:</strong> Time since first article<br/>
                <strong>Fill Opacity:</strong> Trend value (10-100%)<br/>
                <strong>Border Width:</strong> Bias rating<br/>
                <strong>Border Opacity:</strong> Factual reporting
              </div>
            </div>
            <div class="legend-section">
              <div class="legend-title">Concentric Markers</div>
              <div style="font-size: 10px;">Multiple articles at same location shown as nested circles</div>
            </div>
          </div>
          <script>
            try {
              const map = L.map('map').setView([39.8, -98.5], 4);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
              }).addTo(map);

              const markers = ${'__MARKERS__'};
              const trendPolygons = ${JSON.stringify(trendPolygons)};
              
              // Always show legend when there are markers
              if (markers && markers.length > 0) {
                document.getElementById('trend-legend').style.display = 'block';
              }
              
              // Add trend polygons as heatmap overlay
              if (trendPolygons && trendPolygons.length > 0) {
                trendPolygons.forEach(polygon => {
                  const coords = polygon.geometry.coordinates[0].map(c => [c[1], c[0]]);
                  const layer = L.polygon(coords, {
                    color: polygon.properties.color,
                    weight: 2,
                    opacity: 0.6,
                    fillOpacity: polygon.properties.opacity,
                    fillColor: polygon.properties.color
                  });
                  
                  layer.bindPopup(polygon.properties.tooltip);
                  layer.addTo(map);
                });
              }

              const markerGroup = L.featureGroup(); // Use featureGroup instead of markerClusterGroup

              const circleMarkers = [];
              const polylines = [];
              
              // Helper function to get fill color based on valence
              function getValenceColor(valence) {
                if (!valence && valence !== 0) return '#9ca3af'; // Grey (neutral)
                // valence: -1 to 0 = red to grey, 0 to 1 = grey to blue
                if (valence < 0) {
                  // Negative: red (interpolate from red to grey)
                  const t = valence + 1; // 0 to 1
                  const r = Math.round(255);
                  const g = Math.round(156 + (175 - 156) * t);
                  const b = Math.round(63 + (175 - 63) * t);
                  return \`rgb(\${r},\${g},\${b})\`;
                } else {
                  // Positive: blue (interpolate from grey to blue)
                  const t = valence; // 0 to 1
                  const r = Math.round(156 - 156 * t);
                  const g = Math.round(175 - 100 * t);
                  const b = Math.round(175 + 80 * t);
                  return \`rgb(\${r},\${g},\${b})\`;
                }
              }

              // Helper function to get category border color
              function getCategoryColor(category) {
                const categoryColors = {
                  'retraction': '#ef4444',        // Red
                  'correction': '#f59e0b',        // Orange
                  'news-article': '#22c55e',      // Green
                  'biased-source': '#8b5cf6',     // Purple
                  'untruthful-source': '#d946ef'  // Pink
                };
                return categoryColors[category] || '#9e9e9e'; // Default gray
              }

              // Helper function to get bias stroke width
              function getBiasStrokeWidth(bias) {
                if (!bias) return 2; // Default width
                // bias ranges from -30 (liberal) to 30 (conservative)
                // Map to stroke width 0 to 5
                return Math.max(0.5, Math.abs(bias) / 6);
              }

              // Helper function to get factual reporting opacity
              function getFactualReportingOpacity(factualReporting) {
                const opacityMap = {
                  'MIXED': 0.25,
                  'HIGH': 0.5,
                  'VERY_HIGH': 1.0
                };
                return opacityMap[factualReporting] || 0.5;
              }

  // Helper function to get marker size based on time since first article
  function getMarkerRadiusFromTime(firstArticleTime, publishDate) {
    if (!firstArticleTime || !publishDate) return 20; // Default larger radius
    const timeDiff = new Date(publishDate).getTime() - firstArticleTime;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    // 500 miles radius at day 0 (marker radius ~25), 50 miles radius at max (marker radius ~2.5)
    // Scale from 25 to 2.5 (proportional to radius range 500 to 50 miles)
    const maxDays = 30;
    const scale = Math.max(2.5, 25 - (Math.min(daysDiff, maxDays) / maxDays) * 22.5);
    return scale;
  }              // Group markers by location for spiral pattern
              const locationMap = {};
              markers.forEach((marker, idx) => {
                const key = marker.latitude + ',' + marker.longitude;
                if (!locationMap[key]) locationMap[key] = [];
                locationMap[key].push({ marker, idx });
              });

              // Helper function to generate golden spiral coordinates
              // Oldest article at center, spiraling outward to newest
              // Radius scales with zoom level so spiral is visible at all zoom levels
              function getSpiralPosition(position, total, baseLatitude, baseLongitude) {
                const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
                const angle = (position / total) * Math.PI * 4; // Multiple rotations
                
                // Scale radius based on current zoom level
                // At zoom 4 (far out): larger radius so spiral is visible
                // At zoom 18 (zoomed in): smaller radius for precision
                const zoomLevel = map.getZoom();
                const baseSpiralRadius = 0.005; // Base radius in degrees
                const zoomScaleFactor = Math.pow(2, (zoomLevel - 10) / 3); // Exponential scaling
                const radius = (position / total) * baseSpiralRadius * zoomScaleFactor;
                
                const lat = baseLatitude + radius * Math.cos(angle);
                const lon = baseLongitude + radius * Math.sin(angle);
                
                return { lat, lon };
              }

              // Store marker positions for drawing lines between them
              const markerPositions = [];
              
              // Add markers with spiral positioning
              markers.forEach((marker, idx) => {
                const key = marker.latitude + ',' + marker.longitude;
                const markersAtLocation = locationMap[key];
                const positionInCluster = markersAtLocation.findIndex(m => m.idx === idx);
                const totalAtLocation = markersAtLocation.length;
                
                // Sort markers at this location by publish date (oldest first for spiral center)
                const sortedMarkers = [...markersAtLocation].sort((a, b) => 
                  new Date(a.marker.publishDate).getTime() - new Date(b.marker.publishDate).getTime()
                );
                const spiralPosition = sortedMarkers.findIndex(m => m.idx === idx);
                
                // Calculate spiral coordinates
                const spiralCoord = getSpiralPosition(spiralPosition, totalAtLocation, marker.latitude, marker.longitude);
                let lat = spiralCoord.lat;
                let lon = spiralCoord.lon;
                
                // Store position for line drawing
                markerPositions.push({ lat, lon, color: marker.color, idx });

                // Get styling based on new properties
                const valenceColor = getValenceColor(marker.valence);
                const borderColor = getCategoryColor(marker.category || marker.status);
                const borderWidth = getBiasStrokeWidth(marker.bias);
                const borderOpacity = getFactualReportingOpacity(marker.factualReporting);
                
                // Calculate marker size (no offset needed for spiral)
                const markerRadius = getMarkerRadiusFromTime(marker.firstArticleTime, marker.publishDate);

                // Build trend terms HTML
                let trendTermsHTML = '';
                if (marker.trendTerms && marker.trendTerms.length > 0) {
                  const trendsList = marker.trendTerms.map(t => t.term + ': ' + t.value).join('<br/>');
                  trendTermsHTML = '<br/><strong>Trend Terms:</strong><br/>' + trendsList;
                }

                // Build sentiment text
                const sentimentText = marker.sentiment ? 'Sentiment: ' + marker.sentimentLabel + ' (' + marker.sentiment.score.toFixed(2) + ')' : 'Sentiment: Unknown';

                // Build encoding details HTML
                const encodingHTML = '<br/><strong>Visual Encoding:</strong><br/>' +
                  'Valence: ' + (marker.valence ? marker.valence.toFixed(2) : 'Unknown') + '<br/>' +
                  'Category: ' + (marker.category || marker.status) + '<br/>' +
                  'Bias: ' + (marker.bias !== undefined ? marker.bias : 'Unknown') + '<br/>' +
                  'Factual Reporting: ' + (marker.factualReporting || 'Unknown');

                // Build tooltip content
                const titleLink = marker.link 
                  ? '<a href="' + marker.link + '" target="_blank" style="color: #3b82f6; text-decoration: underline; font-weight: 600;">' + marker.title + '</a>'
                  : '<strong>' + marker.title + '</strong>';
                
                const tooltipContent = titleLink + '<br/>Status: ' + marker.status + '<br/>City: ' + (marker.city || 'Unknown') + '<br/>Source: ' + (marker.source || 'Unknown') + '<br/>' + sentimentText + '<br/>Trend at publish: ' + (marker.trendValue || 0) + trendTermsHTML + '<br/>Date: ' + (marker.publishDate || 'N/A') + encodingHTML;

                const circle = L.circleMarker([lat, lon], {
                  radius: markerRadius,
                  fillColor: valenceColor,
                  color: borderColor,
                  weight: borderWidth,
                  opacity: borderOpacity,
                  fillOpacity: Math.max(0.1, marker.trendValue ? Math.min(marker.trendValue / 100, 1) : 0.6)
                })
                .bindPopup(tooltipContent);

                markerGroup.addLayer(circle);
                circleMarkers.push(circle);
              });
              
              // Calculate distance between two points (Haversine formula)
              function calculateDistance(lat1, lon1, lat2, lon2) {
                const R = 3959; // Earth radius in miles
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
              }
              
              // Animate line fading in
              function animateLineFadeIn(polyline, totalDuration) {
                let progress = 0;
                const startTime = Date.now();
                
                function updateLine() {
                  progress = (Date.now() - startTime) / totalDuration;
                  if (progress >= 1) {
                    polyline.setStyle({ opacity: 0.6 });
                    return;
                  }
                  polyline.setStyle({ opacity: 0.6 * progress });
                  requestAnimationFrame(updateLine);
                }
                updateLine();
              }
              
              // Animate line fading out
              function animateLineFadeOut(polyline, totalDuration) {
                let progress = 0;
                const startTime = Date.now();
                
                function updateLine() {
                  progress = (Date.now() - startTime) / totalDuration;
                  if (progress >= 1) {
                    polyline.setStyle({ opacity: 0 });
                    return;
                  }
                  polyline.setStyle({ opacity: 0.6 * (1 - progress) });
                  requestAnimationFrame(updateLine);
                }
                updateLine();
              }
              
              // Timeline animation with scrubbing support
              let isPlaying = false;
              let timelineAnimationId = null;
              let timelineStartTime = 0;
              let timelineElapsed = 0;
              let isScrubbing = false;
              let animationDurationValue = 10000;
              
              // Sort markers by publish date and get time range (moved outside function for availability in timeline controls)
              const sortedMarkers = [...circleMarkers].sort((a, b) => {
                const aDate = new Date(markers.find(m => m.id === a.options.markerId)?.publishDate || 0).getTime();
                const bDate = new Date(markers.find(m => m.id === b.options.markerId)?.publishDate || 0).getTime();
                return aDate - bDate;
              });
              
              let markerDates = [];
              let minTime = 0;
              let maxTime = 0;
              let timeSpan = 1;
              
              if (sortedMarkers.length > 0) {
                // Get time range
                markerDates = sortedMarkers.map(m => {
                  const marker = markers.find(mk => mk.id === m.options.markerId);
                  return new Date(marker?.publishDate || 0).getTime();
                });
                
                minTime = Math.min(...markerDates);
                maxTime = Math.max(...markerDates);
                timeSpan = maxTime - minTime || 1;
                animationDurationValue = Math.max(10000, sortedMarkers.length * 800);
              }
              
              function playTimelineAnimationWithScrubbing() {
                // Hide all markers initially
                circleMarkers.forEach(m => m.setStyle({ opacity: 0, fillOpacity: 0 }));
                
                isPlaying = true;
                timelineStartTime = Date.now() - timelineElapsed;
                
                const playBtn = document.getElementById('timeline-play-btn');
                if (playBtn) playBtn.textContent = '⏸ Pause';
                
                // Remove any existing polylines from previous animation
                featureGroup.eachLayer((layer) => {
                  if (layer instanceof L.Polyline) {
                    featureGroup.removeLayer(layer);
                  }
                });
                
                const animateTimelineFrame = () => {
                  if (!isPlaying) return;
                  
                  if (!isScrubbing) {
                    timelineElapsed = Date.now() - timelineStartTime;
                  }
                  
                  const progress = Math.min(timelineElapsed / animationDurationValue, 1);
                  const currentTime = minTime + (progress * timeSpan);
                  
                  // Update slider
                  const slider = document.getElementById('timeline-slider');
                  if (slider && !isScrubbing) {
                    slider.value = (progress * 100).toFixed(1);
                  }
                  
                  // Update time display
                  const timeDisplay = document.getElementById('timeline-time');
                  if (timeDisplay) {
                    const seconds = Math.floor(timelineElapsed / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    timeDisplay.textContent = \`\${minutes}:\${String(secs).padStart(2, '0')}\`;
                  }
                  
                  // Show markers up to current time
                  sortedMarkers.forEach((marker, idx) => {
                    const markerTime = markerDates[idx];
                    
                    if (markerTime <= currentTime) {
                      marker.setStyle({ opacity: 0.8, fillOpacity: 0.8 });
                    } else {
                      marker.setStyle({ opacity: 0, fillOpacity: 0 });
                    }
                  });
                  
                  if (progress < 1 && isPlaying) {
                    timelineAnimationId = requestAnimationFrame(animateTimelineFrame);
                  } else if (progress >= 1) {
                    // Animation complete
                    isPlaying = false;
                    circleMarkers.forEach(m => m.setStyle({ opacity: 0.8, fillOpacity: 0.8 }));
                    if (playBtn) playBtn.textContent = '▶ Play Timeline';
                  }
                };
                
                animateTimelineFrame();
              }
              
              function toggleTimelinePlayback() {
                if (isPlaying) {
                  isPlaying = false;
                  const playBtn = document.getElementById('timeline-play-btn');
                  if (playBtn) playBtn.textContent = '▶ Play Timeline';
                } else {
                  playTimelineAnimationWithScrubbing();
                }
              }
              
              // Only set up timeline controls if we have markers
              if (sortedMarkers.length > 0) {
                // Calculate date range and get unique article dates with time compression
                const uniqueDatesWithTimes = [];
                const dateToIndexMap = new Map();
                
                // Get unique dates and map them
                sortedMarkers.forEach((m, idx) => {
                  const date = new Date(markerDates[idx]);
                  const dateKey = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                  if (!dateToIndexMap.has(dateKey)) {
                    dateToIndexMap.set(dateKey, {
                      date: date,
                      time: markerDates[idx],
                      displayStr: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
                    });
                    uniqueDatesWithTimes.push({ date, time: markerDates[idx], displayStr: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) });
                  }
                });
                
                // Sort by time
                uniqueDatesWithTimes.sort((a, b) => a.time - b.time);
                
                // Calculate compressed positions - distribute evenly and ignore large gaps
                const compressedPositions = [];
                if (uniqueDatesWithTimes.length > 1) {
                  uniqueDatesWithTimes.forEach((_, i) => {
                    // Linear distribution: spread all dates evenly across the slider
                    const position = (i / (uniqueDatesWithTimes.length - 1)) * 100;
                    compressedPositions.push(position);
                  });
                } else {
                  compressedPositions.push(50);
                }
                
                // Format date range
                const startDate = new Date(markerDates[0]);
                const endDate = new Date(markerDates[markerDates.length - 1]);
                const startDateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const endDateStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                // Add playback controls to HTML
              const controlsHTML = `
                <div id="timeline-controls" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; background: rgba(255,255,255,0.95); padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-family: system-ui, sans-serif;">
                  <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <button id="timeline-play-btn" onclick="window.toggleTimelinePlayback && window.toggleTimelinePlayback()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; white-space: nowrap;">▶ Play Timeline</button>
                    <span id="timeline-time" style="font-size: 12px; color: #666; white-space: nowrap; min-width: 80px; font-weight: 600;">0:00</span>
                  </div>
                  <div style="position: relative; margin-bottom: 8px;">
                    <input id="timeline-slider" type="range" min="0" max="100" value="0" style="width: 100%; min-width: 300px; height: 8px; border-radius: 4px; outline: none; -webkit-appearance: slider-horizontal; appearance: slider-horizontal; cursor: pointer; padding: 0; margin: 0;" />
                    <div style="position: absolute; top: -24px; left: 0; right: 0; display: flex; justify-content: space-between; font-size: 11px; color: #999; pointer-events: none;">
                      <span>${startDateStr}</span>
                      <span>${endDateStr}</span>
                    </div>
                    <div style="position: absolute; top: 12px; left: 0; right: 0; height: 12px; display: flex; pointer-events: none;">
                      ${compressedPositions.map((pos, i) => {
                        return `<div style="position: absolute; left: ${pos}%; width: 2px; height: 10px; background: #3b82f6; opacity: 0.8; transform: translateX(-50%);"></div>`;
                      }).join('')}
                    </div>
                  </div>
                  <div style="font-size: 11px; color: #999; text-align: center; margin-top: 4px;">
                    ${uniqueDatesWithTimes.length} article dates | ${sortedMarkers.length} total articles
                  </div>
                </div>
              `;
              document.body.insertAdjacentHTML('beforeend', controlsHTML);
              
              // Handle slider interaction
              const slider = document.getElementById('timeline-slider');
              if (slider) {
                slider.addEventListener('mousedown', () => {
                  isScrubbing = true;
                });
                slider.addEventListener('mouseup', () => {
                  isScrubbing = false;
                });
                slider.addEventListener('input', (e) => {
                  const progress = parseFloat(e.target.value) / 100;
                  timelineElapsed = progress * animationDurationValue;
                  
                  // Calculate which article we're at based on progress through the time range
                  const currentTime = minTime + (progress * timeSpan);
                  
                  // Find closest article date to show in display
                  let closestArticleDate = null;
                  let closestDistance = Infinity;
                  
                  markerDates.forEach((date) => {
                    const distance = Math.abs(date - currentTime);
                    if (distance < closestDistance) {
                      closestDistance = distance;
                      closestArticleDate = new Date(date);
                    }
                  });
                  
                  // Update time display with date or elapsed time
                  const timeDisplay = document.getElementById('timeline-time');
                  if (timeDisplay && closestArticleDate) {
                    const dateStr = closestArticleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    timeDisplay.textContent = dateStr;
                  }
                });
              }
              
              window.toggleTimelinePlayback = toggleTimelinePlayback;
              } // End of sortedMarkers.length > 0 condition

              
              // Add marker ID tracking
              circleMarkers.forEach((marker, idx) => {
                marker.options.markerId = markers[idx]?.id;
              });
              
              // Start drawing all markers and lines
              setTimeout(() => {
                drawAllMarkers();
              }, 300);

              if (markers.length > 0) {
                map.addLayer(markerGroup);
              }

              // Fit bounds
              const allLayers = circleMarkers.concat(trendPolygons.length > 0 ? trendPolygons.map(() => map) : []);
              if (circleMarkers.length > 0) {
                try {
                  const group = new L.featureGroup(circleMarkers);
                  map.fitBounds(group.getBounds().pad(0.1));
                } catch (e) {
                  console.error('Bounds error:', e);
                }
              }
            } catch (error) {
              console.error('Map error:', error);
              document.body.innerHTML = '<div style="padding: 20px; color: red;">Map failed to load</div>';
            }
          <\/script>
        </body>
        </html>
      `;
      setMapHtml(html.replace('__MARKERS__', JSON.stringify(allMarkers)));
    }
  }, [markers, trendPolygons, isDark, trendMarkers]);

  // For web, use iframe
  if (typeof window !== 'undefined' && !markers.length) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#101922' : '#f6f7f8' }]}>
        <View style={[styles.placeholder, { backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
          <Text style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>No articles to display on map</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#101922' : '#f6f7f8' }]}>
      {markers.length > 0 ? (
        <iframe
          srcDoc={mapHtml}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none',
            borderRadius: 8
          }}
          title="Article Map"
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
          <ScrollView style={styles.mapFallback}>
            {markers.map((marker) => (
              <View
                key={marker.id}
                style={[
                  styles.markerItem,
                  { borderLeftColor: marker.color, backgroundColor: isDark ? '#0f172a' : '#ffffff' }
                ]}
              >
                <View style={[styles.markerDot, { backgroundColor: marker.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.markerTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                    {marker.title}
                  </Text>
                  <Text style={[styles.markerStatus, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    {marker.status}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f8'
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  mapFallback: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden'
  },
  markerItem: {
    flexDirection: 'row',
    padding: 12,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  markerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a'
  },
  markerStatus: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  }
});
