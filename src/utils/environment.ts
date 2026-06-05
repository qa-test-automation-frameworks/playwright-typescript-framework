import { APIRequestContext } from '@playwright/test';
import { config } from './config';

export type EnvironmentReadiness = {
  uiStatus: number;
  apiStatus: number;
};

export async function assertEnvironmentReady(
  request: APIRequestContext,
): Promise<EnvironmentReadiness> {
  const [uiResponse, apiResponse] = await Promise.all([
    request.get(config.BASE_URL, { failOnStatusCode: false }),
    request.get(`${config.API_URL}/articles?limit=1`, { failOnStatusCode: false }),
  ]);

  const readiness = {
    uiStatus: uiResponse.status(),
    apiStatus: apiResponse.status(),
  };

  if (readiness.uiStatus >= 500 || readiness.apiStatus >= 500) {
    throw new Error(
      `Environment readiness failed. UI status: ${readiness.uiStatus}; API status: ${readiness.apiStatus}. Use a controlled RealWorld deployment for deterministic CI.`,
    );
  }

  if (readiness.uiStatus < 200 || readiness.uiStatus >= 400) {
    throw new Error(`UI target is not ready. ${config.BASE_URL} returned ${readiness.uiStatus}.`);
  }

  if (readiness.apiStatus < 200 || readiness.apiStatus >= 400) {
    throw new Error(`API target is not ready. ${config.API_URL} returned ${readiness.apiStatus}.`);
  }

  return readiness;
}
