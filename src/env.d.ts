interface ImportMetaEnv {
  readonly PUBLIC_UMAMI_SRC?: string;
  readonly PUBLIC_UMAMI_ID?: string;
}

interface Window {
  umami?: { track(event: string, data?: Record<string, string | number>): void };
}
