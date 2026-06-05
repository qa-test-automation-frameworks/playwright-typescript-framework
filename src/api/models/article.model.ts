import { z } from 'zod';
import { ProfileSchema } from './profile.model';

export const ArticleSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  body: z.string().min(1),
  tagList: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  favorited: z.boolean(),
  favoritesCount: z.number(),
  author: ProfileSchema,
});

export const ArticleResponseSchema = z.object({
  article: ArticleSchema,
});

export const ArticleSummarySchema = ArticleSchema.omit({ body: true }).extend({
  body: z.string().optional(),
});

export const ArticleListSchema = z.object({
  articles: z.array(ArticleSummarySchema),
  articlesCount: z.number(),
});

export const CreateArticleRequestSchema = z.object({
  article: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    body: z.string().min(1),
    tagList: z.array(z.string()).optional(),
  }),
});

export const UpdateArticleRequestSchema = z.object({
  article: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    body: z.string().optional(),
    tagList: z.array(z.string()).optional(),
  }),
});

export type Article = z.infer<typeof ArticleSchema>;
export type ArticleResponse = z.infer<typeof ArticleResponseSchema>;
export type ArticleList = z.infer<typeof ArticleListSchema>;
export type CreateArticleRequest = z.infer<typeof CreateArticleRequestSchema>;
export type UpdateArticleRequest = z.infer<typeof UpdateArticleRequestSchema>;
