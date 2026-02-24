
import type { GoogleNewsArticle } from './googleNewsClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Sends Google News articles to the ingestion endpoint in smaller, manageable chunks.
 * This helps prevent timeouts or payload limits when dealing with a large number of articles.
 * * @param articles The full array of Google News articles to send.
 * @param searchTerms The search terms associated with the articles.
 * @param chunkSize The maximum number of articles to include in a single request (default is 50).
 * @returns A promise that resolves to an object containing the overall status and total received count.
 */
export async function sendGoogleNewsArticlesInChunks(
  articles: GoogleNewsArticle[],
  searchTerms: string[],
  chunkSize: number = 50 // Default chunk size
): Promise<{ status: string; received: number }> {
  
  if (articles.length === 0) {
    return { status: 'success', received: 0 };
  }

  // 1. Initialize variables for tracking
  let totalReceived = 0;
  const numChunks = Math.ceil(articles.length / chunkSize);

  console.log(`Sending ${articles.length} articles in ${numChunks} chunks of size ${chunkSize}.`);

  // 2. Process chunks sequentially
  for (let i = 0; i < numChunks; i++) {
    // Calculate the start and end index for the current chunk
    const start = i * chunkSize;
    const end = start + chunkSize;
    
    // Slice the original array to get the current chunk
    const chunk = articles.slice(start, end);

    console.log(`Processing chunk ${i + 1}/${numChunks} (${chunk.length} articles)...`);

    try {
      // 3. Send the current chunk
      const res = await fetch(`${API_BASE_URL}/api/google-news/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: chunk, // Send only the current chunk
          searchTerms,
          fetchedAt: new Date().toISOString()
        })
      });

      // 4. Handle response and update count
      if (!res.ok) {
        // Throw an error specific to the failed chunk, but the loop continues to the next chunk
        throw new Error(`Failed to send chunk ${i + 1}: ${res.statusText}`);
      }

      const result: { received: number } = await res.json();
      totalReceived += result.received;
      
      console.log(`Chunk ${i + 1} succeeded. Received: ${result.received}. Total received: ${totalReceived}`);

    } catch (error) {
      console.error(`An error occurred while processing chunk ${i + 1}:`, error);
      // You might choose to re-throw here to stop on the first failure, 
      // or just log and continue to the next chunk (as done here).
    }
  }

  // 5. Return the overall status
  return { status: 'completed with potential errors in chunks', received: totalReceived };
}
