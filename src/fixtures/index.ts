import { scenarioFixtures } from './scenario.fixtures';
import '../utils/custom-matchers';

export const test = scenarioFixtures;
export { expect } from '@playwright/test';
export type { ApiFixtures } from './api.fixtures';
export type { AuthFixtures } from './auth.fixtures';
export type { CleanupFixtures } from './cleanup.fixtures';
export type { PageFixtures } from './page.fixtures';
export type { ScenarioFixtures } from './scenario.fixtures';
