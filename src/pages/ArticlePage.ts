import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { testIds } from './test-ids';

export class ArticlePage extends BasePage {
  constructor(page: Page) {
    super(page, '');
  }

  private get articleBanner(): Locator {
    return this.page
      .locator('.banner')
      .filter({ has: this.page.getByTestId(testIds.articleTitle) });
  }

  private get articleMeta(): Locator {
    return this.articleBanner.locator('.article-meta');
  }

  public get titleHeading(): Locator {
    return this.articleBanner.getByTestId(testIds.articleTitle);
  }

  public get bodyContent(): Locator {
    return this.page.getByTestId(testIds.articleBody);
  }

  public get authorLink(): Locator {
    return this.articleMeta.getByTestId(testIds.articleAuthor);
  }

  public get tagItems(): Locator {
    return this.page.getByTestId(testIds.articleTag);
  }

  public get commentTextarea(): Locator {
    return this.page.getByPlaceholder('Write a comment...');
  }

  public get postCommentButton(): Locator {
    return this.page.getByRole('button', { name: /comment/i });
  }

  public get commentCards(): Locator {
    return this.page.getByTestId(testIds.commentCard);
  }

  public get commentTexts(): Locator {
    return this.page.getByTestId(testIds.commentText);
  }

  public get editButton(): Locator {
    return this.articleMeta
      .getByRole('link', { name: /edit/i })
      .or(this.articleMeta.getByRole('button', { name: /edit/i }));
  }

  public get deleteButton(): Locator {
    return this.articleMeta.getByRole('button', { name: /delete article/i });
  }

  public get followButton(): Locator {
    return this.articleMeta.getByRole('button', { name: /^follow/i });
  }

  public get unfollowButton(): Locator {
    return this.articleMeta.getByRole('button', { name: /^unfollow/i });
  }

  public get favoriteButton(): Locator {
    return this.articleMeta.getByRole('button', { name: /^favorite/i });
  }

  public get unfavoriteButton(): Locator {
    return this.articleMeta.getByRole('button', { name: /^unfavorite/i });
  }

  public async postComment(text: string): Promise<void> {
    await this.commentTextarea.fill(text);
    await this.postCommentButton.focus();
    await this.postCommentButton.press('Enter');
  }

  public async deleteComment(text: string): Promise<void> {
    const card = this.commentCards.filter({ hasText: text });
    await card.getByRole('button', { name: /delete/i }).click();
  }

  public async favoriteArticle(): Promise<void> {
    await this.favoriteButton.click();
  }

  public async unfavoriteArticle(): Promise<void> {
    await this.unfavoriteButton.click();
  }

  public async editArticle(): Promise<void> {
    await this.editButton.click();
  }

  public async deleteArticle(): Promise<void> {
    await this.deleteButton.click();
  }

  public async followAuthor(): Promise<void> {
    await this.followButton.click();
  }

  public async unfollowAuthor(): Promise<void> {
    await this.unfollowButton.click();
  }
}
