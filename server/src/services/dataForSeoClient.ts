import axios from 'axios';

const DATAFORSEO_API_URL = 'https://api.dataforseo.com/v3/serp/google/organic/live/regular';

export interface DataForSeoResult {
  tasks: any[];
}

export async function fetchDataForSeoSERP(query: string, apiKey: string, apiSecret: string) {
  const postData = [{
    "language_code": "en",
    "location_code": 2840, // United States
    "keyword": query
  }];

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const response = await axios.post<DataForSeoResult>(
    DATAFORSEO_API_URL,
    postData,
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}
