import { defineConfig } from '@playwright/test';
import { nativeEvidenceMetadata } from './scripts/evidence/native-metadata';

export default defineConfig({
  testDir: 'scripts/evidence/probe',
  metadata: nativeEvidenceMetadata(),
  projects: [{ name: 'evidence-control' }],
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/evidence-control/results.json' }]],
});
