import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface MapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  status: string;
  color: string;
}

interface MapProps {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  isDark?: boolean;
}

export default function MapView({ markers, onMarkerPress, isDark }: MapProps) {
  const mapRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    if (webViewRef.current && markers.length > 0) {
      // Calculate bounds from markers
      const lats = markers.map(m => m.latitude);
      const lons = markers.map(m => m.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      // Create HTML for Leaflet map
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            * { margin: 0; padding: 0; }
            body { ${isDark ? 'background: #101922; color: #f8fafc;' : 'background: #f6f7f8; color: #0f172a;'} }
            #map { height: 100vh; width: 100vw; }
            .leaflet-control-attribution { ${isDark ? 'background: rgba(15, 23, 42, 0.8) !important; color: #f8fafc !important;' : ''} }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([39.8, -98.5], 4);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            const markers = ${JSON.stringify(markers)};
            const circleMarkers = [];

            markers.forEach(marker => {
              const circle = L.circleMarker([marker.latitude, marker.longitude], {
                radius: 8,
                fillColor: marker.color,
                color: '#000',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.8
              })
              .bindPopup(\`<strong>\${marker.title}</strong><br/>\${marker.status}\`)
              .addTo(map);

              circle.on('click', function() {
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                  type: 'markerPress',
                  marker: marker
                }));
              });

              circleMarkers.push(circle);
            });

            // Fit bounds
            if (markers.length > 0) {
              const group = new L.featureGroup(circleMarkers);
              map.fitBounds(group.getBounds().pad(0.1));
            }
          </script>
        </body>
        </html>
      `;

      webViewRef.current?.postMessage(html);
    }
  }, [markers, isDark]);

  return (
    <View style={styles.container}>
      {/* This would use WebView in React Native or iframe in web */}
      <View style={styles.placeholder}>
        <View style={styles.mapFallback}>
          {markers.map((marker) => (
            <View
              key={marker.id}
              style={[
                styles.markerItem,
                { borderLeftColor: marker.color }
              ]}
            >
              <View style={[styles.markerDot, { backgroundColor: marker.color }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.markerTitle}>{marker.title}</View>
                <View style={styles.markerStatus}>{marker.status}</View>
              </View>
            </View>
          ))}
        </View>
      </View>
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
