import type { ReliabilityFault, ReliabilityIdentity } from './reliability-lab';

export interface NativeReporterError {
  location?: { file: string; line: number; column: number };
  message: string;
}

export interface NativeReporterAttachment {
  name: string;
  contentType: string;
  path?: string;
  body?: string;
}

export interface NativeReporterTest {
  projectName: string;
  status: string;
  expectedStatus: string;
  results: Array<{
    status: string;
    errors: NativeReporterError[];
    attachments: NativeReporterAttachment[];
  }>;
}

export interface NativeReporterSpec {
  title: string;
  file?: string;
  tests: NativeReporterTest[];
}

export interface NativeReporterSuite {
  title: string;
  file?: string;
  line?: number;
  column?: number;
  specs?: NativeReporterSpec[];
  suites?: NativeReporterSuite[];
}

export interface NativeReporterReport {
  suites: NativeReporterSuite[];
  errors?: NativeReporterError[];
}

export interface GatheredNativeTest {
  file: string;
  project: string;
  suites: string[];
  title: string;
  test: NativeReporterTest;
}

export interface ControlExecution {
  exitCode: number | null;
  signal?: string | null;
  errorCode?: string | null;
  spawnError?: boolean;
  timedOut?: boolean;
}

export interface ControlClassification {
  disposition: 'CLEAN' | 'DETECTED' | 'MISSED' | 'INVALID_CONTROL';
  reason?: string;
  category?: string;
  origin?: string;
  ruleId?: string;
  attachments?: string[];
}

export function gatherTests(suites: NativeReporterSuite[]): GatheredNativeTest[];
export function classifyControl(input: {
  control: ReliabilityFault & { support?: ReliabilityIdentity[] };
  phase: 'clean' | 'mutated';
  execution: ControlExecution;
  reportState: 'valid' | 'missing' | 'malformed';
  report: NativeReporterReport | null;
  attachmentPaths?: Set<string>;
  preflight?: { baselineValid?: boolean };
}): ControlClassification;
export function summarizeNumbers(values: number[]): {
  count: number;
  min: number;
  median: number;
  max: number;
} | null;
