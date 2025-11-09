/**
 * Mock RSS Fetcher - Phase 0 Demonstrator
 * Returns a static feed of 10 mock articles with realistic metadata
 */

export interface Article {
  id: string;
  title: string;
  author: string;
  link: string;
  publishDate: string;
  description: string;
  source: string;
}

export function getMockArticles(): Article[] {
  return [
    {
      id: '1',
      title: 'Mayor Calls for Urgent Action on Community Safety',
      author: 'John Smith',
      link: 'https://example.com/article/1',
      publishDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Local government officials gather to discuss rising concerns about community safety measures.',
      source: 'NY Times'
    },
    {
      id: '2',
      title: 'City Council Addresses Public Health Initiative',
      author: 'Sarah Johnson',
      link: 'https://example.com/article/2',
      publishDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'New public health measures announced following community input and expert recommendations.',
      source: 'Washington Post'
    },
    {
      id: '3',
      title: 'UPDATE: Previous Report Requires Clarification',
      author: 'Michael Brown',
      link: 'https://example.com/article/3',
      publishDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      description: 'Correction: Earlier reporting on the incident was incomplete; here are the verified facts.',
      source: 'Reuters'
    },
    {
      id: '4',
      title: 'Regional Protests Erupt Over Policy Disagreement',
      author: 'Emma Wilson',
      link: 'https://example.com/article/4',
      publishDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      description: 'Hundreds gather in downtown area to voice opposition to new governmental policies.',
      source: 'BBC'
    },
    {
      id: '5',
      title: 'RETRACTED: Unverified Claims About Local Official',
      author: 'David Lee',
      link: 'https://example.com/article/5',
      publishDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      description: 'Retraction: This article has been withdrawn. The claims made could not be independently verified.',
      source: 'AP News'
    },
    {
      id: '6',
      title: 'Community Event Draws Thousands to Urban Center',
      author: 'Lisa Chen',
      link: 'https://example.com/article/6',
      publishDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      description: 'Annual festival celebrates local culture and brings together diverse community members.',
      source: 'NPR'
    },
    {
      id: '7',
      title: 'School District Implements New Education Standards',
      author: 'Robert Martinez',
      link: 'https://example.com/article/7',
      publishDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      description: 'Educational leaders announce comprehensive curriculum updates effective next semester.',
      source: 'PBS'
    },
    {
      id: '8',
      title: 'Market Analysis: Economic Shift in Region',
      author: 'Angela White',
      link: 'https://example.com/article/8',
      publishDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      description: 'Financial experts weigh in on emerging trends affecting local business landscape.',
      source: 'Bloomberg'
    },
    {
      id: '9',
      title: 'Environmental Group Raises Concerns About Development',
      author: 'Thomas Brown',
      link: 'https://example.com/article/9',
      publishDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      description: 'Conservation advocates question sustainability of proposed urban expansion project.',
      source: 'Guardian'
    },
    {
      id: '10',
      title: 'New Transit Infrastructure Opens to Public',
      author: 'Jennifer Garcia',
      link: 'https://example.com/article/10',
      publishDate: new Date().toISOString(),
      description: 'Long-awaited public transportation improvements now available; impacts on traffic expected.',
      source: 'Axios'
    }
  ];
}
