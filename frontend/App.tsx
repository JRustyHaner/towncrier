import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView from './components/MapView';

const { width, height } = Dimensions.get('window');

interface Article {
  id: string;
  title: string;
  author: string;
  source: string;
  publishDate: string;
  link: string;
  description: string;
  status: string;
  city: string;
  confidence: number;
  latitude?: number;
  longitude?: number;
}

interface Legend {
  statuses: Record<string, { color: string; shape: string; label: string }>;
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

const API_BASE_URL = 'http://localhost:3000';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [legend, setLegend] = useState<Legend | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [summary, setSummary] = useState({ total: 0, retractions: 0, corrections: 0, originals: 0, inciting: 0 });
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [trendPolygons, setTrendPolygons] = useState<TrendPolygon[]>([]);
  const [showTrendOverlay, setShowTrendOverlay] = useState(false);
  const [trendKeyword, setTrendKeyword] = useState('');
  const [trendStats, setTrendStats] = useState<any>(null);

  // Color scheme
  const colors = isDark
    ? {
        background: '#101922',
        surface: '#0f172a',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        border: '#1f2937',
        primary: '#137fec'
      }
    : {
        background: '#f6f7f8',
        surface: '#ffffff',
        text: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#137fec'
      };

  useEffect(() => {
    fetchLegend();
  }, []);

  const fetchLegend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/legend`);
      const data = await res.json();
      setLegend(data);
    } catch (error) {
      console.error('Failed to fetch legend:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const searchRes = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: [searchTerm], limit: 1000 })
      });
      const { search_id } = await searchRes.json();

      // Poll for results with exponential backoff
      let results;
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * increasing delays = ~30 seconds max
      let delay = 500; // Start with 500ms

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        const resultsRes = await fetch(`${API_BASE_URL}/api/search/${search_id}/results`);
        
        if (!resultsRes.ok) {
          attempts++;
          delay = Math.min(delay * 1.2, 2000); // Exponential backoff, max 2 seconds
          continue;
        }

        results = await resultsRes.json();
        if (results.ready) break;
        
        attempts++;
        delay = Math.min(delay * 1.2, 2000);
      }

      if (!results) {
        throw new Error('Search results not ready after timeout');
      }

      // Convert GeoJSON features to articles with coordinates
      const articlesWithCoords = results.geojson.features.map((feature: any) => ({
        ...feature.properties,
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0]
      }));

      setArticles(articlesWithCoords);
      setSummary(results.summary);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendVisualization = async (keyword: string) => {
    if (!keyword.trim()) return;

    setLoading(true);
    setTrendKeyword(keyword);
    try {
      const res = await fetch(`${API_BASE_URL}/api/trends/${encodeURIComponent(keyword)}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch trends: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Extract polygons from visualization
      if (data.visualization && data.visualization.polygons) {
        setTrendPolygons(data.visualization.polygons);
        setTrendStats(data.statistics);
        setShowTrendOverlay(true);
      }
    } catch (error) {
      console.error('Trend visualization failed:', error);
      alert(`Failed to load trend visualization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'retraction':
        return '#ef4444';
      case 'correction':
        return '#f59e0b';
      case 'original':
        return '#22c55e';
      case 'inciting':
        return '#137fec';
      default:
        return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'retraction':
        return 'circle';
      case 'correction':
        return 'square';
      case 'original':
        return 'triangle';
      case 'inciting':
        return 'ring';
      default:
        return 'circle';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Town Crier</Text>
        <TouchableOpacity
          onPress={() => setIsDark(!isDark)}
          style={[styles.themeToggle, { backgroundColor: colors.primary }]}
        >
          <MaterialCommunityIcons
            name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search articles..."
          placeholderTextColor={colors.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          onPress={handleSearch}
          disabled={loading}
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Legend */}
      {legend && (
        <ScrollView
          horizontal
          style={[styles.legendContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
          showsHorizontalScrollIndicator={false}
        >
          {Object.entries(legend.statuses).map(([key, { color, shape, label }]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: color }]} />
              <Text style={[styles.legendLabel, { color: colors.text }]}>{label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Summary Stats */}
      {summary.total > 0 && (
        <View style={[styles.summaryContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            Found {summary.total} articles • {summary.retractions} retractions • {summary.corrections} corrections
          </Text>
        </View>
      )}

      {/* Tab Navigation */}
      {articles.length > 0 && (
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('map')}
            style={[
              styles.tab,
              activeTab === 'map' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
          >
            <MaterialCommunityIcons 
              name="map" 
              size={20} 
              color={activeTab === 'map' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'map' ? colors.primary : colors.textSecondary }]}>
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('list')}
            style={[
              styles.tab,
              activeTab === 'list' && [styles.tabActive, { borderBottomColor: colors.primary }]
            ]}
          >
            <MaterialCommunityIcons 
              name="list" 
              size={20} 
              color={activeTab === 'list' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 'list' ? colors.primary : colors.textSecondary }]}>
              List
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Trend Controls - Always visible when articles are displayed */}
      {articles.length > 0 && (
        <View style={[styles.trendControlsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.trendControlLabel, { color: colors.text }]}>Trend Overlay:</Text>
          <TouchableOpacity
            onPress={() => {
              if (searchTerm.trim()) {
                fetchTrendVisualization(searchTerm);
              }
            }}
            style={[
              styles.trendButton,
              { 
                backgroundColor: showTrendOverlay ? colors.primary : colors.border,
                opacity: loading ? 0.6 : 1
              }
            ]}
            disabled={loading}
          >
            <MaterialCommunityIcons 
              name={showTrendOverlay ? 'chart-line' : 'chart-line-variant'} 
              size={16} 
              color="white" 
            />
            <Text style={styles.trendButtonText}>
              {loading ? 'Loading...' : showTrendOverlay ? 'Active' : 'Load Trends'}
            </Text>
          </TouchableOpacity>
          {trendStats && showTrendOverlay && (
            <View style={[styles.trendStatsCompact, { backgroundColor: colors.background }]}>
              <Text style={[styles.trendStatText, { color: colors.textSecondary }]}>
                📈 Peak: {trendStats.peakIntensity}% | 
                Days: {trendStats.lifespanDays}
                {trendStats.timeToDeathDays ? ` | Death: ${trendStats.timeToDeathDays}d` : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Map View */}
      {activeTab === 'map' && articles.length > 0 && (
        <MapView
          markers={articles.map(article => ({
            id: article.id,
            title: article.title,
            latitude: article.latitude || 0,
            longitude: article.longitude || 0,
            status: article.status,
            color: getStatusColor(article.status)
          }))}
          trendPolygons={showTrendOverlay ? trendPolygons : []}
          onMarkerPress={(marker) => {
            const article = articles.find(a => a.id === marker.id);
            if (article) setSelectedArticle(article);
          }}
          isDark={isDark}
        />
      )}

      {/* Articles List */}
      {activeTab === 'list' && (
        <FlatList
          data={articles}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              onPress={() => setSelectedArticle(item)}
              style={[styles.articleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <MaterialCommunityIcons name={getStatusIcon(item.status)} size={16} color="white" />
              </View>
              <View style={styles.articleContent}>
                <Text style={[styles.articleTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.articleMeta, { color: colors.textSecondary }]}>
                  {item.source} • {item.city}
                </Text>
                <Text style={[styles.articleDate, { color: colors.textSecondary }]} numberOfLines={1}>
                  {new Date(item.publishDate).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* Article Detail Modal */}
      <Modal
        visible={!!selectedArticle}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedArticle(null)}
      >
        {selectedArticle && (
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setSelectedArticle(null)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Article Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
                <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedArticle.status) }]}>
                  <Text style={styles.statusLabel}>{selectedArticle.status.toUpperCase()}</Text>
                </View>

                <Text style={[styles.detailTitle, { color: colors.text }]}>
                  {selectedArticle.title}
                </Text>

                <View style={styles.detailMeta}>
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    {selectedArticle.source}
                  </Text>
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    {new Date(selectedArticle.publishDate).toLocaleString()}
                  </Text>
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    By {selectedArticle.author}
                  </Text>
                  <Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>
                    📍 {selectedArticle.city}
                  </Text>
                </View>

                <Text style={[styles.detailDescription, { color: colors.text }]}>
                  {selectedArticle.description}
                </Text>

                <TouchableOpacity
                  style={[styles.readButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    // Open link (would use Linking.openURL in real implementation)
                    console.log('Opening:', selectedArticle.link);
                  }}
                >
                  <Text style={styles.readButtonText}>Read Full Article</Text>
                  <MaterialCommunityIcons name="open-in-new" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1
  },
  title: {
    fontSize: 24,
    fontWeight: '700'
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainer: {
    flexDirection: 'row',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  legendContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 60
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    gap: 6
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500'
  },
  summaryContainer: {
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 6,
    borderWidth: 1
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500'
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomWidth: 2
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500'
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  articleCard: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 12
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  articleContent: {
    flex: 1,
    gap: 4
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600'
  },
  articleMeta: {
    fontSize: 12
  },
  articleDate: {
    fontSize: 11
  },
  modalContainer: {
    flex: 1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  modalContent: {
    flex: 1,
    padding: 12
  },
  detailSection: {
    padding: 16,
    borderRadius: 8,
    gap: 16
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  statusLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700'
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  detailMeta: {
    gap: 8
  },
  detailMetaText: {
    fontSize: 14
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  readButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  readButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  trendControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12
  },
  trendControlLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  trendButton: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    gap: 6
  },
  trendButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  trendStatsCompact: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto'
  },
  trendStatText: {
    fontSize: 11,
    fontWeight: '500'
  }

});
