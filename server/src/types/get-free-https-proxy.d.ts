declare module 'get-free-https-proxy' {
  interface Proxy {
    host: string;
    port: number;
  }

  function getProxies(): Promise<Proxy[]>;
  export = getProxies;
}
