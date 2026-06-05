import { faker } from '@faker-js/faker';
import { CreateCommentRequest } from '../api/models/comment.model';

export class CommentBuilder {
  private body = `Comment ${faker.string.alphanumeric({ length: 10, casing: 'lower' })} ${faker.lorem.sentence()}`;

  public withBody(body: string): this {
    this.body = body;
    return this;
  }

  public build(): CreateCommentRequest {
    return {
      comment: {
        body: this.body,
      },
    };
  }
}
