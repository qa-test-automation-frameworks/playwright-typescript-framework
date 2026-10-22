import { ApiError } from '../api/BaseApiClient';
import { Logger } from './logger';
import { withSpan } from '../observability/telemetry';

export type CleanupFailure = {
  resourceType: string;
  resourceId: string;
  error: string;
  status?: number;
};

export class CleanupAggregateError extends Error {
  public readonly code = 'CLEANUP_FAILURE';

  constructor(public readonly failures: CleanupFailure[]) {
    super(`Cleanup failed for ${failures.length} resource(s).`);
    this.name = 'CleanupAggregateError';
  }

  public toDiagnosticRecord(): {
    schemaVersion: 1;
    code: string;
    failureOrigin: 'test-fixture-teardown';
    failures: Array<{ resourceType: string; status: number | null }>;
  } {
    return {
      schemaVersion: 1,
      code: this.code,
      failureOrigin: 'test-fixture-teardown',
      failures: this.failures.map(({ resourceType, status }) => ({
        resourceType,
        status: status ?? null,
      })),
    };
  }
}

type CleanupAction = {
  resourceType: string;
  resourceId: string;
  deleteAction: () => Promise<unknown>;
};

export class CleanupRegistry {
  private failures: CleanupFailure[] = [];
  private actions: CleanupAction[] = [];

  public registerResource(
    resourceType: string,
    resourceId: string,
    deleteAction: () => Promise<unknown>,
  ): void {
    this.actions.push({ resourceType, resourceId, deleteAction });
  }

  public async cleanupAll(): Promise<void> {
    const actions = [...this.actions].reverse();
    this.actions = [];

    for (const action of actions) {
      await this.deleteResource(action.resourceType, action.resourceId, action.deleteAction);
    }
  }

  public async deleteResource(
    resourceType: string,
    resourceId: string,
    deleteAction: () => Promise<unknown>,
  ): Promise<void> {
    await withSpan(
      `cleanup:${resourceType}`,
      { 'cleanup.resource_type': resourceType, 'cleanup.resource_id': resourceId },
      async () => {
        try {
          await deleteAction();
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            Logger.warn('Cleanup skipped because resource is already absent', {
              resourceType,
              resourceId,
              status: error.status,
            });
            return;
          }

          const failure = {
            resourceType,
            resourceId,
            error: error instanceof Error ? error.message : String(error),
            ...(error instanceof ApiError ? { status: error.status } : {}),
          };
          this.failures.push(failure);
          Logger.error('Cleanup failed', error instanceof Error ? error : undefined, failure);
        }
      },
    );
  }

  public assertClean(): void {
    if (this.failures.length === 0) {
      return;
    }

    throw new CleanupAggregateError(this.failures);
  }
}
