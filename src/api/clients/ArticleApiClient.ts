import { BaseApiClient } from '../BaseApiClient';
import { EmptyResponseSchema } from '../models/common.model';
import {
  ArticleResponseSchema,
  ArticleResponse,
  ArticleListSchema,
  ArticleList,
  CreateArticleRequest,
  UpdateArticleRequest,
} from '../models/article.model';

export class ArticleApiClient {
  constructor(private api: BaseApiClient) {}

  public async createArticle(data: CreateArticleRequest): Promise<ArticleResponse> {
    return this.api.post<ArticleResponse>('/articles', ArticleResponseSchema, data);
  }

  public async getArticle(slug: string): Promise<ArticleResponse> {
    return this.api.get<ArticleResponse>(`/articles/${slug}`, ArticleResponseSchema);
  }

  public async updateArticle(slug: string, data: UpdateArticleRequest): Promise<ArticleResponse> {
    return this.api.put<ArticleResponse>(`/articles/${slug}`, ArticleResponseSchema, data);
  }

  public async deleteArticle(slug: string): Promise<unknown> {
    return this.api.delete<unknown>(`/articles/${slug}`, EmptyResponseSchema);
  }

  public async listArticles(
    params?: Record<string, string | number | boolean>,
  ): Promise<ArticleList> {
    return this.api.get<ArticleList>(
      '/articles',
      ArticleListSchema,
      params ? { params } : undefined,
    );
  }

  public async listFeed(params?: Record<string, string | number | boolean>): Promise<ArticleList> {
    return this.api.get<ArticleList>(
      '/articles/feed',
      ArticleListSchema,
      params ? { params } : undefined,
    );
  }

  public async favoriteArticle(slug: string): Promise<ArticleResponse> {
    return this.api.post<ArticleResponse>(`/articles/${slug}/favorite`, ArticleResponseSchema);
  }

  public async unfavoriteArticle(slug: string): Promise<ArticleResponse> {
    return this.api.delete<ArticleResponse>(`/articles/${slug}/favorite`, ArticleResponseSchema);
  }
}
