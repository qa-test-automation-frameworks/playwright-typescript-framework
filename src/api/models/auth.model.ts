import { z } from 'zod';

export const UserSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  username: z.string().min(1),
  bio: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

export const UserResponseSchema = z.object({
  user: UserSchema,
});

export const LoginRequestSchema = z.object({
  user: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const RegisterRequestSchema = z.object({
  user: z.object({
    username: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const UpdateUserRequestSchema = z.object({
  user: z.object({
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    bio: z.string().nullable().optional(),
    image: z.string().url().nullable().optional(),
  }),
});

export type User = z.infer<typeof UserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
