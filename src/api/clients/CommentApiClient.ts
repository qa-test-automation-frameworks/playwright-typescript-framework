import { BaseApiClient } from '../BaseApiClient';
import { EmptyResponseSchema } from '../models/common.model';
import {
  CommentResponseSchema,
  CommentResponse,
  CommentListSchema,
  CommentList,
  CreateCommentRequest,
} from '../models/comment.model';

export class CommentApiClient {
  constructor(private api: BaseApiClient) {}

  public async addComment(slug: string, data: CreateCommentRequest): Promise<CommentResponse> {
    return this.api.post<CommentResponse>(
      `/articles/${slug}/comments`,
      CommentResponseSchema,
      data,
    );
  }

  public async getComments(slug: string): Promise<CommentList> {
    return this.api.get<CommentList>(`/articles/${slug}/comments`, CommentListSchema);
  }

  public async deleteComment(slug: string, commentId: number): Promise<unknown> {
    return this.api.delete<unknown>(`/articles/${slug}/comments/${commentId}`, EmptyResponseSchema);
  }
}
