/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { extname, join, normalize } from 'path';
import { z } from 'zod';

type User = {
  email: string;
  username: string;
  password: string;
  bio: string | null;
  image: string | null;
  following: Set<string>;
  favorites: Set<string>;
};

type Article = {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  author: string;
};

type Comment = {
  id: number;
  slug: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt: string;
};

type UserInput = {
  email?: string;
  username?: string;
  password?: string;
  bio?: string | null;
  image?: string | null;
};
type ArticleInput = { title?: string; description?: string; body?: string; tagList?: string[] };
type CommentInput = { body?: string };
type RequestBody = {
  user?: UserInput;
  article?: ArticleInput;
  comment?: CommentInput;
};

const requestBodySchema = z
  .object({
    user: z
      .object({
        email: z.string().email().optional(),
        username: z.string().min(1).optional(),
        password: z.string().min(1).optional(),
        bio: z.string().nullable().optional(),
        image: z.string().nullable().optional(),
      })
      .optional(),
    article: z
      .object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        body: z.string().min(1).optional(),
        tagList: z.array(z.string()).optional(),
      })
      .optional(),
    comment: z.object({ body: z.string().min(1).optional() }).optional(),
  })
  .strict();

const port = Number(process.env.TARGET_PORT || 4300);
const seedUser = {
  email: process.env.TEST_USER_EMAIL || 'seed.user@example.test',
  password: process.env.TEST_USER_PASSWORD || `Seed-${randomUUID()}!`,
  username: process.env.TEST_USER_USERNAME || 'seeduser',
};

let users = new Map<string, User>();
let articles = new Map<string, Article>();
let comments: Comment[] = [];
let nextCommentId = 1;

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(body));
};

const reset = () => {
  users = new Map();
  articles = new Map();
  comments = [];
  nextCommentId = 1;
  const user = makeUser(seedUser.email, seedUser.username, seedUser.password);
  users.set(user.email, user);
  const article = makeArticle(user.username, {
    title: 'Controlled Target Welcome Article',
    description: 'Deterministic seed article',
    body: 'This article is owned by the repo controlled test target.',
    tagList: ['seed', 'welcome'],
  });
  articles.set(article.slug, article);
};

const makeUser = (email: string, username: string, password: string): User => ({
  email,
  username,
  password,
  bio: null,
  image: null,
  following: new Set(),
  favorites: new Set(),
});

const slugify = (title: string) =>
  `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now()}`;

const makeArticle = (
  username: string,
  input: { title: string; description: string; body: string; tagList?: string[] },
): Article => {
  const now = new Date().toISOString();
  return {
    slug: slugify(input.title),
    title: input.title,
    description: input.description,
    body: input.body,
    tagList: input.tagList || [],
    createdAt: now,
    updatedAt: now,
    author: username,
  };
};

const tokenFor = (email: string) => Buffer.from(email).toString('base64url');
const userForToken = (req: IncomingMessage): User | undefined => {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Token\s+/i, '');
  const email = Buffer.from(token, 'base64url').toString();
  return users.get(email);
};

const publicUser = (user: User) => ({
  email: user.email,
  token: tokenFor(user.email),
  username: user.username,
  bio: user.bio,
  image: user.image,
});

const profile = (viewer: User | undefined, username: string) => {
  const user = [...users.values()].find((item) => item.username === username);
  if (!user) return null;
  return {
    username: user.username,
    bio: user.bio,
    image: user.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
    following: viewer ? viewer.following.has(user.username) : false,
  };
};

const articleDto = (viewer: User | undefined, article: Article) => ({
  slug: article.slug,
  title: article.title,
  description: article.description,
  body: article.body,
  tagList: article.tagList,
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
  favorited: viewer ? viewer.favorites.has(article.slug) : false,
  favoritesCount: [...users.values()].filter((user) => user.favorites.has(article.slug)).length,
  author: profile(viewer, article.author),
});

const readBody = async (req: IncomingMessage, res: ServerResponse): Promise<RequestBody | null> =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve({});
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        json(res, 400, { errors: { body: ['request body must be valid JSON'] } });
        return resolve(null);
      }
      const result = requestBodySchema.safeParse(parsed);
      if (!result.success) {
        json(res, 422, { errors: { body: result.error.issues.map((issue) => issue.message) } });
        return resolve(null);
      }
      return resolve(result.data as RequestBody);
    });
  });

const requireUser = (req: IncomingMessage, res: ServerResponse) => {
  const user = userForToken(req);
  if (!user) {
    json(res, 401, { errors: { body: ['authentication required'] } });
  }
  return user;
};

const sendUi = (res: ServerResponse) => {
  const html = readFileSync(join(__dirname, 'ui.html'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
};

const handleApi = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
  const path = url.pathname.replace(/^\/api/, '');
  const method = req.method || 'GET';
  const viewer = userForToken(req);

  if (method === 'OPTIONS') return json(res, 204, {});
  if (path === '/health') return json(res, 200, { status: 'ok' });
  if (path === '/reset' && method === 'POST') {
    reset();
    return json(res, 200, { status: 'reset' });
  }
  if (path === '/users' && method === 'POST') {
    const body = await readBody(req, res);
    if (!body) return;
    const input = body.user || {};
    if (!input.email || !input.username || !input.password) {
      return json(res, 422, { errors: { body: ['email, username, and password are required'] } });
    }
    if (users.has(input.email) || [...users.values()].some((u) => u.username === input.username)) {
      return json(res, 409, { errors: { body: ['email or username already exists'] } });
    }
    const user = makeUser(input.email, input.username, input.password);
    users.set(user.email, user);
    return json(res, 200, { user: publicUser(user) });
  }
  if (path === '/users/login' && method === 'POST') {
    const body = await readBody(req, res);
    if (!body) return;
    const user = body.user?.email ? users.get(body.user.email) : undefined;
    if (!user || user.password !== body.user?.password) {
      return json(res, 401, { errors: { body: ['email or password is invalid'] } });
    }
    return json(res, 200, { user: publicUser(user) });
  }
  if (path === '/user' && method === 'GET') {
    const user = requireUser(req, res);
    return user && json(res, 200, { user: publicUser(user) });
  }
  if (path === '/user' && method === 'PUT') {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await readBody(req, res);
    if (!body) return;
    const input = body.user || {};
    if (input.email && users.has(input.email) && input.email !== user.email) {
      return json(res, 422, { errors: { body: ['email already exists'] } });
    }
    if (
      input.username &&
      [...users.values()].some(
        (candidate) => candidate.username === input.username && candidate.email !== user.email,
      )
    ) {
      return json(res, 422, { errors: { body: ['username already exists'] } });
    }
    const previousEmail = user.email;
    if (input.email) {
      user.email = input.email;
      users.delete(previousEmail);
      users.set(user.email, user);
    }
    if (input.username) user.username = input.username;
    if (input.password) user.password = input.password;
    if ('bio' in input) user.bio = input.bio ?? null;
    if ('image' in input) user.image = input.image ?? null;
    return json(res, 200, { user: publicUser(user) });
  }
  if (path === '/tags')
    return json(res, 200, { tags: [...new Set([...articles.values()].flatMap((a) => a.tagList))] });
  if (path === '/articles' && method === 'GET') {
    let list = [...articles.values()];
    const tag = url.searchParams.get('tag');
    const author = url.searchParams.get('author');
    const favorited = url.searchParams.get('favorited');
    if (tag) list = list.filter((article) => article.tagList.includes(tag));
    if (author) list = list.filter((article) => article.author === author);
    if (favorited) {
      const user = [...users.values()].find((item) => item.username === favorited);
      list = user ? list.filter((article) => user.favorites.has(article.slug)) : [];
    }
    const articlesCount = list.length;
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || list.length);
    list = list.slice(offset, offset + limit);
    return json(res, 200, {
      articles: list.map((a) => articleDto(viewer, a)),
      articlesCount,
    });
  }
  if (path === '/articles/feed' && method === 'GET') {
    const user = requireUser(req, res);
    if (!user) return;
    let list = [...articles.values()].filter((article) => user.following.has(article.author));
    const articlesCount = list.length;
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || list.length);
    list = list.slice(offset, offset + limit);
    return json(res, 200, {
      articles: list.map((a) => articleDto(user, a)),
      articlesCount,
    });
  }
  if (path === '/articles' && method === 'POST') {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await readBody(req, res);
    if (!body) return;
    const input = body.article || {};
    if (!input.title || !input.description || !input.body) {
      return json(res, 422, { errors: { body: ['title, description, and body are required'] } });
    }
    const article = makeArticle(user.username, {
      title: input.title,
      description: input.description,
      body: input.body,
      tagList: input.tagList || [],
    });
    articles.set(article.slug, article);
    return json(res, 200, { article: articleDto(user, article) });
  }
  const articleMatch = path.match(/^\/articles\/([^/]+)(?:\/(favorite|comments)(?:\/(\d+))?)?$/);
  if (articleMatch) {
    const [, matchedSlug, action, commentId] = articleMatch;
    const slug = matchedSlug || '';
    const article = articles.get(slug);
    if (!article) return json(res, 404, { errors: { body: ['article not found'] } });
    if (!action && method === 'GET')
      return json(res, 200, { article: articleDto(viewer, article) });
    if (!action && method === 'PUT') {
      const user = requireUser(req, res);
      if (!user || user.username !== article.author)
        return json(res, 404, { errors: { body: ['article not found'] } });
      const body = await readBody(req, res);
      if (!body) return;
      const input = body.article || {};
      if (input.title) article.title = input.title;
      if (input.description) article.description = input.description;
      if (input.body) article.body = input.body;
      if (input.tagList) article.tagList = input.tagList;
      article.updatedAt = new Date().toISOString();
      return json(res, 200, { article: articleDto(user, article) });
    }
    if (!action && method === 'DELETE') {
      const user = requireUser(req, res);
      if (!user || user.username !== article.author)
        return json(res, 404, { errors: { body: ['article not found'] } });
      articles.delete(slug);
      return json(res, 200, {});
    }
    if (action === 'favorite') {
      const user = requireUser(req, res);
      if (!user) return;
      if (method === 'POST') user.favorites.add(slug);
      if (method === 'DELETE') user.favorites.delete(slug);
      return json(res, 200, { article: articleDto(user, article) });
    }
    if (action === 'comments' && method === 'GET') {
      return json(res, 200, {
        comments: comments
          .filter((c) => c.slug === slug)
          .map((c) => ({ ...c, author: profile(viewer, c.author) })),
      });
    }
    if (action === 'comments' && method === 'POST') {
      const user = requireUser(req, res);
      if (!user) return;
      const now = new Date().toISOString();
      const requestBody = await readBody(req, res);
      if (!requestBody) return;
      const body = requestBody.comment?.body;
      if (!body?.trim()) return json(res, 422, { errors: { body: ['comment body is required'] } });
      const comment = {
        id: nextCommentId++,
        slug,
        body,
        author: user.username,
        createdAt: now,
        updatedAt: now,
      };
      comments.push(comment);
      return json(res, 200, { comment: { ...comment, author: profile(user, user.username) } });
    }
    if (action === 'comments' && method === 'DELETE' && commentId) {
      const user = requireUser(req, res);
      if (!user) return;
      const comment = comments.find((c) => c.id === Number(commentId) && c.slug === slug);
      if (!comment || comment.author !== user.username) {
        return json(res, 404, { errors: { body: ['comment not found'] } });
      }
      comments = comments.filter((c) => c.id !== Number(commentId));
      return json(res, 200, {});
    }
  }
  const profileMatch = path.match(/^\/profiles\/([^/]+)(?:\/follow)?$/);
  if (profileMatch) {
    const username = decodeURIComponent(profileMatch[1] || '');
    if (path.endsWith('/follow')) {
      const user = requireUser(req, res);
      if (!user) return;
      if (method === 'POST') user.following.add(username);
      if (method === 'DELETE') user.following.delete(username);
      return json(res, 200, { profile: profile(user, username) });
    }
    const found = profile(viewer, username);
    return found
      ? json(res, 200, { profile: found })
      : json(res, 404, { errors: { body: ['profile not found'] } });
  }
  return json(res, 404, { errors: { body: ['not found'] } });
};

reset();

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`);
  if (url.pathname.startsWith('/api')) {
    void handleApi(req, res, url);
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    const file = normalize(join(__dirname, url.pathname));
    const types: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'text/plain' });
    res.end(readFileSync(file));
    return;
  }
  sendUi(res);
}).listen(port, () => {
  process.stdout.write(`Controlled target ready at http://127.0.0.1:${port}\n`);
});
