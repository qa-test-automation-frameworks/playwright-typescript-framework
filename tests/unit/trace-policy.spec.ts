import { expect, test } from '@playwright/test';
import mainConfig from '../../playwright.config';
import { browserTraceMode, sharedAppBrowserPolicy } from '../../src/utils/browser-trace-policy';

const projects = new Map((mainConfig.projects ?? []).map((project) => [project.name, project]));
const retryCount = process.env.CI ? 1 : 0;

test('trace mode follows whether the UI project retries', () => {
  expect(browserTraceMode(0, true)).toBe('retain-on-failure');
  expect(browserTraceMode(1, true)).toBe('on-first-retry');
  expect(browserTraceMode(0, false)).toBe('off');

  for (const name of [
    'chromium-authenticated',
    'firefox-smoke',
    'firefox-regression',
    'webkit-smoke',
    'webkit-regression',
    'chromium-anonymous',
    'mobile-chrome-smoke',
    'mobile-chrome-regression',
  ]) {
    expect(projects.get(name)?.retries).toBe(retryCount);
    expect(projects.get(name)?.use?.trace).toBe(browserTraceMode(retryCount, true));
  }
});

test('zero-retry browser tiers explicitly retain only failing traces', () => {
  for (const name of ['visual', 'accessibility', 'selector-contract']) {
    const project = projects.get(name);
    expect(project?.retries ?? mainConfig.retries).toBe(0);
    expect(project?.use?.trace).toBe('retain-on-failure');
  }
});

test('API-only tests keep the existing non-browser trace policy', () => {
  expect(projects.get('api')?.use?.trace).toBeUndefined();
  expect(mainConfig.use?.trace).toBe('on-first-retry');
});

test('standalone shared-app browser policy retains only synthetic failures', () => {
  expect(sharedAppBrowserPolicy(true)).toEqual({ retries: 0, trace: 'retain-on-failure' });
  expect(sharedAppBrowserPolicy(false)).toEqual({ retries: 0, trace: 'off' });
});
