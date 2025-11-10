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
              max-width: 200px;
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
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="trend-legend" class="trend-legend" style="display: none;">
            <strong>Trend Intensity</strong>
            <div class="trend-legend-item">
              <div class="trend-legend-color" style="background-color: #0047AB;"></div>
              <span>Very Low (0-20%)</span>
            </div>
            <div class="trend-legend-item">
              <div class="trend-legend-color" style="background-color: #00B4D8;"></div>
              <span>Low (20-40%)</span>
            </div>
            <div class="trend-legend-item">
              <div class="trend-legend-color" style="background-color: #7FFF00;"></div>
              <span>Medium (40-60%)</span>
            </div>
            <div class="trend-legend-item">
              <div class="trend-legend-color" style="background-color: #FFA500;"></div>
              <span>High (60-80%)</span>
            </div>
            <div class="trend-legend-item">
              <div class="trend-legend-color" style="background-color: #FF4500;"></div>
              <span>Peak (80-100%)</span>
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
              
              // Add trend polygons as heatmap overlay
              if (trendPolygons && trendPolygons.length > 0) {
                document.getElementById('trend-legend').style.display = 'block';
                
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

              const markerGroup = L.markerClusterGroup({
                maxClusterRadius: 50,
                iconCreateFunction: function(cluster) {
                  const count = cluster.getChildCount();
                  return L.divIcon({
                    html: '<div>' + count + '</div>',
                    className: 'marker-cluster ' + (count < 10 ? 'marker-cluster-small' : count < 100 ? 'marker-cluster-medium' : 'marker-cluster-large'),
                    iconSize: new L.Point(40, 40)
                  });
                }
              });

              const circleMarkers = [];
              
              // Group markers by location to add slight offsets
              const locationMap = {};
              markers.forEach((marker, idx) => {
                const key = marker.latitude + ',' + marker.longitude;
                if (!locationMap[key]) locationMap[key] = [];
                locationMap[key].push({ marker, idx });
              });

              // Add offsets to markers in same location
              markers.forEach((marker, idx) => {
                const key = marker.latitude + ',' + marker.longitude;
                const markersAtLocation = locationMap[key];
                const positionInCluster = markersAtLocation.findIndex(m => m.idx === idx);
                const totalAtLocation = markersAtLocation.length;
                
                // Spread markers in a circle if multiple at same location
                let lat = marker.latitude;
                let lon = marker.longitude;
                
                if (totalAtLocation > 1) {
                  const angle = (positionInCluster / totalAtLocation) * (2 * Math.PI);
                  const radius = 0.015 * Math.min(totalAtLocation / 3, 1);
                  lat = marker.latitude + radius * Math.cos(angle);
                  lon = marker.longitude + radius * Math.sin(angle);
                }

                const circle = L.circleMarker([lat, lon], {
                  radius: 8,
                  fillColor: marker.color,
                  color: '#000',
                  weight: 2,
                  opacity: 0.8,
                  fillOpacity: 0.8
                })
                .bindPopup(\`<strong>\${marker.title}<\/strong><br/>\${marker.status}\`);

                markerGroup.addLayer(circle);
                circleMarkers.push(circle);
              });

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
