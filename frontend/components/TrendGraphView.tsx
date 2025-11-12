import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TrendGraphViewProps {
  trendLabels: string[];
  trendData: number[];
  multiPhraseTrendData?: Array<{ phrase: string; data: Array<{ date: string; value: number }> }>;
}

const phraseColors = [
  'rgba(75,192,192,1)',
  'rgba(153,102,255,1)',
  'rgba(255,159,64,1)',
  'rgba(54,162,235,1)',
  'rgba(201,203,207,1)',
  'rgba(255,99,132,1)'
];

const TrendGraphView: React.FC<TrendGraphViewProps> = ({ trendLabels, trendData, multiPhraseTrendData }) => {
  // Build datasets for multiple phrase trends
  const phraseDatasets = (multiPhraseTrendData || [])
    .filter(p => p.data.length > 0)
    .map((phraseData, idx) => ({
      label: phraseData.phrase,
      data: phraseData.data.map(d => d.value),
      borderColor: phraseColors[idx % phraseColors.length],
      backgroundColor: phraseColors[idx % phraseColors.length].replace('1)', '0.1)'),
      borderWidth: 2,
      fill: false,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 4
    }));

  const data = {
    labels: trendLabels,
    datasets: [
      // Main trend line
      ...(trendData.length > 0 ? [{
        label: 'Primary Trend',
        data: trendData,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4
      }] : []),
      // Multiple phrase trend lines
      ...phraseDatasets,
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12, weight: '500' as const }
        }
      },
      title: {
        display: true,
        text: 'Search Trend Analysis',
        font: { size: 14, weight: '700' as const },
        padding: 15
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: { display: true, maxRotation: 45, minRotation: 0 }
      },
      y: {
        display: true,
        title: { display: true, text: 'Search Interest' },
        min: 0,
        max: 100
      }
    }
  };

  return (
    <View style={styles.container}>
      <Line data={data} options={options} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '35%',
    backgroundColor: 'transparent',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
});

export default TrendGraphView;
