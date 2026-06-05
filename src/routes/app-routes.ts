export const appRoutes = {
  article: (slug: string): string => `/article/${slug}`,
  editor: (slug?: string): string => (slug ? `/editor/${slug}` : '/editor'),
  profile: (username: string): string => `/profile/${username}`,
} as const;
