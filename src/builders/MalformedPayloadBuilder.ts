export class MalformedPayloadBuilder {
  public emptyArticle(): unknown {
    return {
      article: {
        title: '',
        description: '',
        body: '',
        tagList: [],
      },
    };
  }

  public emptyComment(): unknown {
    return {
      comment: {
        body: '',
      },
    };
  }
}
