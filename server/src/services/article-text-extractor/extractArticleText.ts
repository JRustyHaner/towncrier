import read from 'node-readability';

interface Article {
  content: string;
  title: string;
  textBody: string;
  html: string;
  document: any;
  close?: () => void;
}

/**
 * Extracts the main article text from a URL using node-readability.
 * @param url The URL of the article to extract.
 * @returns The extracted article text, or null if extraction fails.
 */
export async function extractArticleText(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    read(url, (err: Error | null, article?: Article) => {
      if (err || !article) {
        resolve(null);
      } else {
        const text = article.textBody || article.content || '';
        article.close && article.close();
        resolve(text);
      }
    });
  });
}
