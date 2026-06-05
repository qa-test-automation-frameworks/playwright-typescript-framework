import { z } from 'zod';

export const ProfileSchema = z.object({
  username: z.string().min(1),
  bio: z.string().nullable().optional(),
  image: z.string().url().nullable().optional(),
  following: z.boolean(),
});

export const ProfileResponseSchema = z.object({
  profile: ProfileSchema,
});

export const FollowResponseSchema = z.object({
  profile: ProfileSchema,
});

export type Profile = z.infer<typeof ProfileSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type FollowResponse = z.infer<typeof FollowResponseSchema>;
