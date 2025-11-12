declare module 'node-readability' {
  interface Article {
    content: string;
    title: string;
    textBody: string;
    html: string;
    document: any;
    close?: () => void;
  }
  type ReadCallback = (err: Error | null, article?: Article) => void;
  function read(url: string, callback: ReadCallback): void;
  export = read;
}
