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
    const headers = this.getHeaders(options.headers);

    Logger.debug(`API Request: ${method} ${fullUrl}`, {
      headers: {
        ...headers,
        Authorization: headers.Authorization ? 'Token [REDACTED]' : undefined,
      },
      params: options.params,
      data: options.data,
    });

    const response = await withSpan(
      `api:${method} ${new URL(fullUrl).pathname}`,
      {
        'api.method': method,
        'api.path': new URL(fullUrl).pathname,
      },
      async (span) => {
        const apiResponse = await this.requestContext.fetch(fullUrl, {
          method,
          headers,
          ...(options.data !== undefined ? { data: options.data } : {}),
          ...(options.params !== undefined ? { params: options.params } : {}),
        });
        span.setAttribute('api.status', apiResponse.status());
        return apiResponse;
      },
    );

    const status = response.status();
    const statusText = response.statusText();
    const responseText = await response.text();

    Logger.debug(`API Response: ${status} ${statusText}`, {
      status,
      body: this.redactResponseBody(responseText),
    });

    if (status < 200 || status >= 300) {
      const redactedBody = this.redactResponseBody(responseText);
      const errorMsg = `API Request failed: ${method} ${fullUrl} returned status ${status} (${statusText}). Response body: ${redactedBody}`;
      throw new ApiError(status, statusText, redactedBody, errorMsg);
    }

    let parsedJson: unknown;
    try {
      parsedJson = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      throw new ApiError(
        status,
        statusText,
        responseText,
        `API Response for ${method} ${fullUrl} was not valid JSON`,
      );
    }

    // Direct .parse() validation as required by final checklist
    try {
      return schema.parse(parsedJson);
    } catch (zodError: unknown) {
      Logger.error(
        `Zod Schema Validation failed for ${method} ${url}`,
        zodError instanceof Error ? zodError : undefined,
        {
          parsedJson,
          error: zodError instanceof Error ? zodError.message : String(zodError),
        },
      );
      throw zodError;
    }
  }

  private redactResponseBody(responseText: string): string {
    if (!responseText) {
      return '';
    }

    try {
      return JSON.stringify(Logger.redact(JSON.parse(responseText)));
    } catch {
      return responseText;
    }
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
