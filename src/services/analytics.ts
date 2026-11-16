import { initAll, track } from '@amplitude/unified';

let ready: Promise<void> | undefined;
let appOpened = false;

export function startAnalytics() {
  const key = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!key) {
    console.error('[amplitude] VITE_AMPLITUDE_API_KEY is not set — no events will be sent');
    return;
  }
  ready ??= initAll(key, {
    serverZone: 'US',
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });
  void ready.catch(() => console.error('[amplitude] Initialization failed'));
}

export function trackAppOpened() {
  if (!ready || appOpened) return;
  // React StrictMode repeats mount effects in development.
  appOpened = true;
  void ready
    .then(() => track('app_opened').promise)
    .then((result) => {
      if (result.code !== 200) console.error('[amplitude] app_opened upload failed');
    })
    .catch(() => console.error('[amplitude] app_opened could not be sent'));
}
