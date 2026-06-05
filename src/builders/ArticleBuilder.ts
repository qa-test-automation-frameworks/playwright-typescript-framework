import { faker } from '@faker-js/faker';
import { CreateArticleRequest, UpdateArticleRequest } from '../api/models/article.model';

const TEST_RUN_ID = (process.env.TEST_RUN_ID || `local-${Date.now()}`)
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, 16);

export class ArticleBuilder {
  private title = `Article ${TEST_RUN_ID} ${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`;
  private description = faker.lorem.sentence({ min: 8, max: 15 });
  private body = faker.lorem.paragraphs(2);
  private tagList = [
    `run-${TEST_RUN_ID}`,
    faker.lorem
      .word()
      .toLowerCase()
      .replace(/[^a-z]/g, '') || 'test',
  ];

  public withTitle(title: string): this {
    this.title = title;
    return this;
  }

  public withDescription(description: string): this {
    this.description = description;
    return this;
  }

  public withBody(body: string): this {
    this.body = body;
    return this;
  }

  public withTags(tags: string[]): this {
    this.tagList = tags;
    return this;
  }

  public build(): CreateArticleRequest {
    return {
      article: {
        title: this.title,
        description: this.description,
        body: this.body,
        tagList: this.tagList,
      },
    };
  }

  public buildUpdate(): UpdateArticleRequest {
    return {
      article: {
        title: this.title,
        description: this.description,
        body: this.body,
        tagList: this.tagList,
      },
    };
  }
}
