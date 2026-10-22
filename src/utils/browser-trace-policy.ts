export type BrowserTraceMode = 'off' | 'on-first-retry' | 'retain-on-failure';

export function browserTraceMode(retries: number, syntheticTarget: boolean): BrowserTraceMode {
  if (!syntheticTarget) return 'off';
  return retries > 0 ? 'on-first-retry' : 'retain-on-failure';
}

export function sharedAppBrowserPolicy(syntheticTarget: boolean): {
  retries: 0;
  trace: BrowserTraceMode;
} {
  return { retries: 0, trace: syntheticTarget ? 'retain-on-failure' : 'off' };
}
