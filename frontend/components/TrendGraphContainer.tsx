import React from 'react';
import { View, StyleSheet } from 'react-native';
import TrendGraph from './TrendGraph';

interface TrendPolygon {
  properties: {
    NAME?: string;
    trend_value?: number;
    last_trending_date?: string | null;
  };
}

interface TrendGraphContainerProps {
  trendPolygons: TrendPolygon[];
}

const TrendGraphContainer: React.FC<TrendGraphContainerProps> = ({ trendPolygons }) => {
  // Show a single trend value (average or max) over all states
  const label = 'Trend Value (All States)';
  // For demo: show the average trend value as a single point
  const avg =
    trendPolygons.length > 0
      ? trendPolygons.reduce((sum, p) => sum + (p.properties.trend_value ?? 0), 0) / trendPolygons.length
      : 0;
  const labels = ['Current'];
  const data = [Math.round(avg * 100) / 100];

  return (
    <View style={styles.container}>
      <TrendGraph labels={labels} data={data} label={label} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '10%',
    minHeight: 60,
    maxHeight: 120,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});

export default TrendGraphContainer;
