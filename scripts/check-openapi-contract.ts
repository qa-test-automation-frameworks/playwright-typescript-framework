import * as fs from 'fs';
import * as path from 'path';
import { ZodSchema } from 'zod';
import { UserResponseSchema } from '../src/api/models/auth.model';
import { ArticleListSchema, ArticleResponseSchema } from '../src/api/models/article.model';
import { CommentListSchema, CommentResponseSchema } from '../src/api/models/comment.model';
import { EmptyResponseSchema } from '../src/api/models/common.model';
import { ProfileResponseSchema } from '../src/api/models/profile.model';

type OpenApiExample = {
  value?: unknown;
};

type OpenApiComponents = {
  schemas?: Record<string, unknown>;
  examples?: Record<string, OpenApiExample>;
  responses?: Record<string, unknown>;
  requestBodies?: Record<string, unknown>;
};

type OpenApiDocument = {
  openapi?: string;
  info?: unknown;
  paths?: Record<string, Record<string, unknown>>;
  components?: OpenApiComponents;
};

const specPath = path.resolve('docs/openapi/conduit-controlled-target.openapi.json');
const requiredPaths: Record<string, string[]> = {
  '/users': ['post'],
  '/users/login': ['post'],
  '/user': ['get', 'put'],
  '/profiles/{username}': ['get'],
  '/profiles/{username}/follow': ['post', 'delete'],
  '/articles': ['get', 'post'],
  '/articles/feed': ['get'],
  '/articles/{slug}': ['get', 'put', 'delete'],
  '/articles/{slug}/comments': ['get', 'post'],
  '/articles/{slug}/comments/{commentId}': ['delete'],
  '/articles/{slug}/favorite': ['post', 'delete'],
};

const requiredSchemas = [
  'UserResponse',
  'ProfileResponse',
  'ArticleResponse',
  'ArticleList',
  'CommentResponse',
  'CommentList',
  'EmptyResponse',
  'ErrorResponse',
] as const;

const runtimeExamples: Array<{
  name: string;
  schema: ZodSchema<unknown>;
}> = [
  { name: 'UserResponse', schema: UserResponseSchema },
  { name: 'ProfileResponse', schema: ProfileResponseSchema },
  { name: 'ArticleResponse', schema: ArticleResponseSchema },
  { name: 'ArticleList', schema: ArticleListSchema },
  { name: 'CommentResponse', schema: CommentResponseSchema },
  { name: 'CommentList', schema: CommentListSchema },
  { name: 'EmptyResponse', schema: EmptyResponseSchema },
];

const failures: string[] = [];
const document = JSON.parse(fs.readFileSync(specPath, 'utf8')) as OpenApiDocument;

if (!document.openapi?.startsWith('3.')) {
  failures.push('OpenAPI document must declare an OpenAPI 3.x version.');
}

for (const [apiPath, methods] of Object.entries(requiredPaths)) {
  const pathItem = document.paths?.[apiPath];
  if (!pathItem) {
    failures.push(`Missing OpenAPI path: ${apiPath}`);
    continue;
  }

  for (const method of methods) {
    if (!pathItem[method]) {
      failures.push(`Missing OpenAPI operation: ${method.toUpperCase()} ${apiPath}`);
    }
  }
}

for (const schemaName of requiredSchemas) {
  if (!document.components?.schemas?.[schemaName]) {
    failures.push(`Missing OpenAPI schema: ${schemaName}`);
  }
}

for (const example of runtimeExamples) {
  const value = document.components?.examples?.[example.name]?.value;
  const result = example.schema.safeParse(value);
  if (!result.success) {
    failures.push(
      `OpenAPI example ${example.name} does not satisfy the runtime Zod schema: ${result.error.message}`,
    );
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `OpenAPI contract check failed:\n${failures.map((item) => `- ${item}`).join('\n')}\n`,
  );
  process.exitCode = 1;
}
