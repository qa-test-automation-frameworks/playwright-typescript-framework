type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const SENSITIVE_KEYS = new Set(['authorization', 'email', 'jwt', 'jwtToken', 'password', 'token']);

export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  public static redact(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
          key,
          SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : this.redact(entry),
        ]),
      );
    }

    return value;
  }

  private static formatMessage(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): string {
    const timestamp = this.getTimestamp();
    const redactedMeta = meta ? this.redact(meta) : undefined;
    const metaString =
      redactedMeta && typeof redactedMeta === 'object' && Object.keys(redactedMeta).length > 0
        ? ` | Meta: ${JSON.stringify(redactedMeta)}`
        : '';
    return `[${timestamp}] [${level}] ${message}${metaString}`;
  }

  public static debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.DEBUG_API === 'true') {
      process.stdout.write(`${this.formatMessage('DEBUG', message, meta)}\n`);
    }
  }

  public static info(message: string, meta?: Record<string, unknown>): void {
    process.stdout.write(`${this.formatMessage('INFO', message, meta)}\n`);
  }

  public static warn(message: string, meta?: Record<string, unknown>): void {
    process.stderr.write(`${this.formatMessage('WARN', message, meta)}\n`);
  }

  public static error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorMeta = error
      ? {
          ...meta,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
        }
      : meta;
    process.stderr.write(`${this.formatMessage('ERROR', message, errorMeta)}\n`);
  }
}
