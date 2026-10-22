export interface ReliabilityTestOutcome {
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  expectedStatus: 'passed' | 'failed' | 'timedOut' | 'skipped';
  results?: Array<{ status: string; errors?: unknown[] }>;
}

export interface ReliabilityIdentity {
  project: string;
  file: string;
  suites: string[];
  title: string;
}

export interface ReliabilityFault {
  name: string;
  title: string;
  identity: ReliabilityIdentity;
  failure: { kind: string; source: { file: string; line?: number }; ruleId?: string };
  args: string[];
}

export function isExpectedOutcome(test: ReliabilityTestOutcome): boolean;
export function isSuccessfulTest(test: ReliabilityTestOutcome): boolean;
export function prepareRunDirectory(
  runDir: string,
  testResultsDir?: string,
): { reportPath: string; testResultsDir: string };
export function summarizeNumbers(values: number[]): {
  count: number;
  min: number;
  median: number;
  max: number;
} | null;
export const faults: ReliabilityFault[];
export const supportCases: ReliabilityIdentity[];
