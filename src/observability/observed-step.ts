import { test } from '@playwright/test';
import { SpanAttributes, withSpan } from './telemetry';

export const observedStep = async <T>(
  name: string,
  callback: () => Promise<T>,
  attributes: SpanAttributes = {},
): Promise<T> =>
  test.step(name, () =>
    withSpan(`step:${name}`, { 'test.step': name, ...attributes }, async () => callback()),
  );
