export type PaginationQuery = {
  limit: number;
  offset: number;
};

export class PaginationQueryBuilder {
  private limit = 10;
  private offset = 0;

  public withLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  public withOffset(offset: number): this {
    this.offset = offset;
    return this;
  }

  public build(): PaginationQuery {
    return {
      limit: this.limit,
      offset: this.offset,
    };
  }
}
