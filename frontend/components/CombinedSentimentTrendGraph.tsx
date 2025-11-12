import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Scatter } from 'react-chartjs-2';
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

interface CombinedGraphProps {
  trendLabels: string[];
  trendData: number[];
  multiPhraseTrendData?: Array<{ phrase: string; data: Array<{ date: string; value: number }> }>;
  sentimentPoints: Array<{
    date: string;
    score: number;
    source: string;
    keywordSentiment?: number;
  }>;
}

// Color palette for multiple phrase lines
const phraseColors = [
  'rgba(75,192,192,1)',
  'rgba(153,102,255,1)',
  'rgba(255,159,64,1)',
  'rgba(54,162,235,1)',
  'rgba(201,203,207,1)',
  'rgba(255,99,132,1)'
];

function getColor(score: number) {
  if (score > 0) return 'rgba(0,200,0,0.8)';
  if (score < 0) return 'rgba(200,0,0,0.8)';
  return 'rgba(200,200,0,0.8)';
}

const CombinedSentimentTrendGraph: React.FC<CombinedGraphProps> = ({ trendLabels, trendData, multiPhraseTrendData, sentimentPoints }) => {
  // Build datasets for multiple phrase trends
  const phraseDatasets = (multiPhraseTrendData || [])
    .filter(p => p.data.length > 0)
    .map((phraseData, idx) => ({
      type: 'line' as const,
      label: `Trend: ${phraseData.phrase}`,
      data: phraseData.data.map(d => ({ x: d.date, y: d.value })),
      borderColor: phraseColors[idx % phraseColors.length],
      backgroundColor: phraseColors[idx % phraseColors.length].replace('1)', '0.1)'),
      borderWidth: 2,
      fill: false,
      tension: 0.3,
      yAxisID: 'y',
      pointRadius: 2,
      pointHoverRadius: 4
    }));

  const data = {
    labels: trendLabels,
    datasets: [
      // Main trend line (if using single keyword)
      ...(trendData.length > 0 ? [{
        type: 'line' as const,
        label: 'Primary Trend',
        data: trendData,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
      }] : []),
      // Multiple phrase trend lines
      ...phraseDatasets,
      {
        type: 'scatter' as const,
        label: 'Article Sentiment',
        data: sentimentPoints.map((p) => ({ x: p.date, y: p.score, source: p.source, keywordSentiment: p.keywordSentiment })),
        pointBackgroundColor: sentimentPoints.map((p) => getColor(p.score)),
        pointBorderColor: sentimentPoints.map((p) => getColor(p.score)),
        pointRadius: 7,
        showLine: false,
        yAxisID: 'y1',
      },
      {
        type: 'scatter' as const,
        label: 'Keyword Sentiment',
        data: sentimentPoints.map((p) => ({ x: p.date, y: p.keywordSentiment ?? p.score, keywordSentiment: p.keywordSentiment })),
        pointBackgroundColor: sentimentPoints.map((p) => getColor(p.keywordSentiment ?? p.score)),
        pointBorderColor: sentimentPoints.map((p) => getColor(p.keywordSentiment ?? p.score)),
        pointRadius: 5,
        pointStyle: 'rect',
        showLine: false,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            if (context.dataset.type === 'scatter') {
              const source = context.raw.source || '';
              const isKeyword = context.datasetIndex === 2;
              if (isKeyword) {
                return `Keyword Sentiment: ${context.parsed.y.toFixed(2)}`;
              }
              return `Article Sentiment: ${context.parsed.y} (Source: ${source})`;
            }
            return `Trend: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        display: false,
        ticks: { display: false },
        grid: { display: false },
      },
      y: {
        display: false,
        min: 0,
        max: 100,
        grid: { display: false },
      },
      y1: {
        display: false,
        min: -10,
        max: 10,
        grid: { display: false },
      },
    },
  };

  return (
    <View style={styles.container}>
      <Scatter data={data} options={options} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '10%',
    backgroundColor: 'transparent',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

export default CombinedSentimentTrendGraph;
