import { z } from 'zod';
import { ProfileSchema } from './profile.model';

export const CommentSchema = z.object({
  id: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  body: z.string().min(1),
  author: ProfileSchema,
});

export const CommentResponseSchema = z.object({
  comment: CommentSchema,
});

export const CommentListSchema = z.object({
  comments: z.array(CommentSchema),
});

export const CreateCommentRequestSchema = z.object({
  comment: z.object({
    body: z.string().min(1),
  }),
});

export type Comment = z.infer<typeof CommentSchema>;
export type CommentResponse = z.infer<typeof CommentResponseSchema>;
export type CommentList = z.infer<typeof CommentListSchema>;
export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;
