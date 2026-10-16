export interface ReliabilityTestOutcome {
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  expectedStatus: 'passed' | 'failed' | 'timedOut' | 'skipped';
}

export function isExpectedOutcome(test: ReliabilityTestOutcome): boolean;
export function isSuccessfulTest(test: ReliabilityTestOutcome): boolean;
