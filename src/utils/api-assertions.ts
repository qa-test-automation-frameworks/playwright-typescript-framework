import { expect } from '@playwright/test';
import { ApiError } from '../api/BaseApiClient';

export async function expectApiError(
  promise: Promise<unknown>,
  statusCode: number,
  bodyIncludes?: string,
): Promise<ApiError> {
  let error: unknown;

  try {
    await promise;
  } catch (err) {
    error = err;
  }

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toHaveStatusCode(statusCode);

  const apiError = error as ApiError;
  if (bodyIncludes) {
    expect(apiError.body).toContain(bodyIncludes);
  }

  return apiError;
}
