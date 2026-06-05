import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config();

const envSchema = z.object({
  BASE_URL: z.string().url('BASE_URL must be an explicit URL for the controlled UI target'),
  API_URL: z.string().url('API_URL must be an explicit URL for the controlled API target'),
  TEST_USER_EMAIL: z.string().email('TEST_USER_EMAIL must be a valid email'),
  TEST_USER_PASSWORD: z.string().min(1, 'TEST_USER_PASSWORD is required'),
  TEST_USER_USERNAME: z.string().min(1, 'TEST_USER_USERNAME is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errorMsg = parsed.error.issues
    .map(
      (issue) =>
        `Environment variable validation failed for ${issue.path.join('.')}: ${issue.message}`,
    )
    .join('\n');
  throw new Error(
    `\n[Config ValidationError]\n${errorMsg}\nCreate a local .env from .env.example or configure CI variables explicitly. Public demo URLs are documented for exploratory runs only; this framework intentionally has no source-code environment defaults.\n`,
  );
}

export const config = parsed.data;
