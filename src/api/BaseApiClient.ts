import { APIRequestContext, APIResponse } from '@playwright/test';
import { ZodSchema } from 'zod';
import { Logger } from '../utils/logger';
import { config } from '../utils/config';
import { withSpan } from '../observability/telemetry';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class BaseApiClient {
  private token: string | null = null;

  constructor(
    protected requestContext: APIRequestContext,
    token?: string,
  ) {
    if (token) {
      this.token = token;
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...customHeaders,
    };

    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    return headers;
  }

  private async executeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    schema: ZodSchema<T>,
    options: {
      data?: unknown;
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean>;
    } = {},
  ): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${config.API_URL}${url}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fullUrl);
    } catch {
      throw new ApiError(0, 'Invalid URL', '', 'API request target is not a valid URL');
    }
    const diagnosticUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    const headers = this.getHeaders(options.headers);

    Logger.debug(`API Request: ${method} ${diagnosticUrl}`, {
      hasAuthorization: Object.keys(headers).some((key) => key.toLowerCase() === 'authorization'),
      headerCount: Object.keys(headers).length,
      hasParameters: options.params !== undefined || parsedUrl.search.length > 0,
      hasBody: options.data !== undefined,
    });

    const response = await withSpan(
      `api:${method} ${new URL(fullUrl).pathname}`,
      {
        'api.method': method,
        'api.path': new URL(fullUrl).pathname,
      },
      async (span) => {
        const apiResponse = await this.requestContext
          .fetch(fullUrl, {
            method,
            headers,
            ...(options.data !== undefined ? { data: options.data } : {}),
            ...(options.params !== undefined ? { params: options.params } : {}),
          })
          .catch(() => {
            // Sanitize before withSpan records the exception for export.
            throw new ApiError(
              0,
              'Transport failure',
              '',
              `API transport failed: ${method} ${diagnosticUrl}`,
            );
          });
        span.setAttribute('api.status', apiResponse.status());
        return apiResponse;
      },
    ).catch(() => {
      throw new ApiError(
        0,
        'Transport failure',
        '',
        `API transport failed: ${method} ${diagnosticUrl}`,
      );
    });

    const status = response.status();
    const responseText = await response.text().catch(() => {
      throw new ApiError(
        status,
        'Response read failure',
        '',
        `API response read failed: ${method} ${diagnosticUrl}`,
      );
    });

    Logger.debug(`API Response: ${status}`, {
      status,
      body: this.redactResponseBody(responseText),
    });

    if (status < 200 || status >= 300) {
      const redactedBody = this.redactResponseBody(responseText);
      const errorMsg = `API Request failed: ${method} ${diagnosticUrl} returned status ${status}. ${redactedBody}`;
      throw new ApiError(status, `HTTP ${status}`, redactedBody, errorMsg);
    }

    let parsedJson: unknown;
    try {
      parsedJson = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new ApiError(
        status,
        `HTTP ${status}`,
        this.redactResponseBody(responseText),
        `API Response for ${method} ${diagnosticUrl} was not valid JSON`,
      );
    }

    // Direct .parse() validation as required by final checklist
    try {
      return schema.parse(parsedJson);
    } catch {
      const error = new ApiError(
        status,
        'Schema validation failed',
        this.redactResponseBody(responseText),
        `Zod Schema Validation failed for ${method} ${diagnosticUrl}`,
      );
      Logger.error(error.message, error, { status });
      throw error;
    }
  }

  private redactResponseBody(responseText: string): string {
    if (!responseText) {
      return '';
    }

    // Remote bodies and parser errors can contain secrets in arbitrary text,
    // including strings under keys that are not in the structured key filter.
    let validationFields: string[] = [];
    let validationCodes: string[] = [];
    try {
      const parsed: unknown = JSON.parse(responseText);
      if (parsed && typeof parsed === 'object' && 'errors' in parsed) {
        const errors: unknown = parsed.errors;
        if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
          // Only known contract field names are diagnostic; never values or arbitrary keys.
          const safeFields = new Set([
            'email',
            'username',
            'password',
            'title',
            'body',
            'description',
          ]);
          validationFields = Object.keys(errors).filter((field) => safeFields.has(field));
          // Exact contract messages map to static codes; no remote text is copied.
          const knownMessages = new Map([
            ['email or username already exists', 'email_or_username_conflict'],
            ['email already exists', 'email_conflict'],
            ['username already exists', 'username_conflict'],
          ]);
          const values: unknown[] = Object.values(errors);
          validationCodes = [
            ...new Set(
              values.flatMap((value) =>
                Array.isArray(value)
                  ? value.flatMap((entry: unknown) =>
                      typeof entry === 'string' && knownMessages.has(entry)
                        ? [knownMessages.get(entry) as string]
                        : [],
                    )
                  : [],
              ),
            ),
          ];
        }
      }
    } catch {
      // Non-JSON input remains completely opaque.
    }
    const fields = validationFields.length
      ? `; validation fields: ${validationFields.join(', ')}`
      : '';
    const codes = validationCodes.length ? `; validation codes: ${validationCodes.join(', ')}` : '';
    return `[REDACTED response body: ${responseText.length} characters${fields}${codes}]`;
  }

  public async get<T>(
    url: string,
    schema: ZodSchema<T>,
    options?: {
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean>;
    },
  ): Promise<T> {
    return this.executeRequest<T>('GET', url, schema, options);
  }

  public async post<T>(
    url: string,
    schema: ZodSchema<T>,
    data?: unknown,
    options?: {
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean>;
    },
  ): Promise<T> {
    return this.executeRequest<T>('POST', url, schema, { ...options, data });
  }

  public async put<T>(
    url: string,
    schema: ZodSchema<T>,
    data?: unknown,
    options?: {
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean>;
    },
  ): Promise<T> {
    return this.executeRequest<T>('PUT', url, schema, { ...options, data });
  }

  public async delete<T>(
    url: string,
    schema: ZodSchema<T>,
    options?: {
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean>;
    },
  ): Promise<T> {
    return this.executeRequest<T>('DELETE', url, schema, options);
  }

  public async rawRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options: {
      data?: string | Buffer;
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean>;
    } = {},
  ): Promise<APIResponse> {
    const fullUrl = url.startsWith('http') ? url : `${config.API_URL}${url}`;
    return this.requestContext.fetch(fullUrl, {
      method,
      headers: this.getHeaders(options.headers),
      ...(options.data !== undefined ? { data: options.data } : {}),
      ...(options.params !== undefined ? { params: options.params } : {}),
    });
  }

  public async rawPost(
    url: string,
    data: string | Buffer,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.rawRequest('POST', url, {
      data,
      ...(headers !== undefined ? { headers } : {}),
    });
  }
}
