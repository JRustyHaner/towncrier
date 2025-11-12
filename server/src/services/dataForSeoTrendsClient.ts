import axios from 'axios';

const DATAFORSEO_TRENDS_URL = 'https://api.dataforseo.com/v3/keywords_data/google_trends/explore/live';

export interface DataForSeoTrendsResult {
  tasks: any[];
}

export async function fetchDataForSeoTrends({
  keywords,
  date_from,
  date_to,
  type = 'web',
  category_code = 0,
  location_name = 'United States',
  apiKey,
  apiSecret
}: {
  keywords: string[];
  date_from: string;
  date_to: string;
  type?: string;
  category_code?: number;
  location_name?: string;
  apiKey: string;
  apiSecret: string;
}) {
  const postData = [{
    location_name,
    date_from,
    date_to,
    type,
    category_code,
    keywords
  }];

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  // Log the outgoing API call (no secrets)
  console.log('[DataForSEO] POST', DATAFORSEO_TRENDS_URL);
  console.log('[DataForSEO] Payload:', JSON.stringify(postData));

  try {
    const response = await axios.post<DataForSeoTrendsResult>(
      DATAFORSEO_TRENDS_URL,
      postData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Log the response status
    console.log('[DataForSEO] Response status:', response.status);
    // Log the response body (not sensitive, but can be large)
    try {
      console.log('[DataForSEO] Response body:', JSON.stringify(response.data, null, 2));
    } catch (e) {
      console.log('[DataForSEO] Response body: [unserializable]', e);
    }
    return response.data;
  } catch (error) {
    console.error('[DataForSEO] Request failed:', error instanceof Error ? error.message : String(error));
    if (axios.isAxiosError(error)) {
      console.error('[DataForSEO] Response status:', error.response?.status);
      console.error('[DataForSEO] Response data:', JSON.stringify(error.response?.data, null, 2));
    }
    throw error;
  }
}
