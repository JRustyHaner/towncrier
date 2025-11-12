import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface SentimentPoint {
  date: string;
  score: number;
}

interface SentimentTimelineGraphProps {
  points: SentimentPoint[];
}

function getColor(score: number) {
  // Green for positive, red for negative, yellow for neutral
  if (score > 0) return 'rgba(0,200,0,0.8)';
  if (score < 0) return 'rgba(200,0,0,0.8)';
  return 'rgba(200,200,0,0.8)';
}

const SentimentTimelineGraph: React.FC<SentimentTimelineGraphProps> = ({ points }) => {
  const data = {
    datasets: [
      {
        label: 'Article Sentiment',
        data: points.map((p) => ({ x: p.date, y: p.score })),
        pointBackgroundColor: points.map((p) => getColor(p.score)),
        pointBorderColor: points.map((p) => getColor(p.score)),
        pointRadius: 7,
        showLine: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Article Sentiment Timeline' },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `Sentiment: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        title: { display: true, text: 'Date' },
        ticks: { autoSkip: true, maxTicksLimit: 10 },
      },
      y: {
        title: { display: true, text: 'Sentiment Score' },
        min: -10,
        max: 10,
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
    minHeight: 120,
    maxHeight: 240,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});

export default SentimentTimelineGraph;
