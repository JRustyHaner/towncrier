import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
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

interface SentimentGraphViewProps {
  sentimentPoints: Array<{
    date: string;
    score: number;
    source: string;
    keywordSentiment?: number;
  }>;
}

function getColor(score: number) {
  if (score > 0) return 'rgba(0,200,0,0.8)';
  if (score < 0) return 'rgba(200,0,0,0.8)';
  return 'rgba(200,200,0,0.8)';
}

const SentimentGraphView: React.FC<SentimentGraphViewProps> = ({ sentimentPoints }) => {
  const data = {
    labels: sentimentPoints.map(p => p.date),
    datasets: [
      {
        type: 'scatter' as const,
        label: 'Article Sentiment',
        data: sentimentPoints.map((p) => ({ x: p.date, y: p.score, source: p.source })),
        pointBackgroundColor: sentimentPoints.map((p) => getColor(p.score)),
        pointBorderColor: sentimentPoints.map((p) => getColor(p.score)),
        pointRadius: 8,
        pointHoverRadius: 10,
        showLine: false,
      },
      {
        type: 'scatter' as const,
        label: 'Keyword Sentiment',
        data: sentimentPoints.map((p) => ({ x: p.date, y: p.keywordSentiment ?? p.score })),
        pointBackgroundColor: sentimentPoints.map((p) => getColor(p.keywordSentiment ?? p.score)),
        pointBorderColor: sentimentPoints.map((p) => getColor(p.keywordSentiment ?? p.score)),
        pointRadius: 6,
        pointStyle: 'rect',
        pointHoverRadius: 8,
        showLine: false,
      },
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
        text: 'Article & Keyword Sentiment Analysis',
        font: { size: 14, weight: '700' as const },
        padding: 15
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const isKeyword = context.datasetIndex === 1;
            if (isKeyword) {
              return `Keyword Sentiment: ${context.parsed.y.toFixed(2)}`;
            }
            return `Article Sentiment: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        display: true,
        ticks: { display: true, maxRotation: 45, minRotation: 0 }
      },
      y: {
        display: true,
        title: { display: true, text: 'Sentiment Score' },
        min: -10,
        max: 10,
        ticks: { stepSize: 2 }
      }
    }
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

export default SentimentGraphView;
