import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { testIds } from './test-ids';

export class ArticlePage extends BasePage {
  constructor(page: Page) {
    super(page, '');
  }

  public get titleHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 }).first();
  }

  public get bodyContent(): Locator {
    return this.page.getByTestId(testIds.articleBody);
  }

  public get authorLink(): Locator {
    return this.page.getByTestId(testIds.articleAuthor).first();
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
    return this.page
      .getByRole('link', { name: /edit/i })
      .or(this.page.getByRole('button', { name: /edit/i }))
      .first();
  }

  public get deleteButton(): Locator {
    return this.page.getByRole('button', { name: /delete/i }).first();
  }

  public get followButton(): Locator {
    return this.page.getByRole('button', { name: /^follow/i }).first();
  }

  public get unfollowButton(): Locator {
    return this.page.getByRole('button', { name: /^unfollow/i }).first();
  }

  public get favoriteButton(): Locator {
    return this.page.getByRole('button', { name: /^favorite/i }).first();
  }

  public get unfavoriteButton(): Locator {
    return this.page.getByRole('button', { name: /^unfavorite/i }).first();
  }

  public async postComment(text: string): Promise<void> {
    await this.commentTextarea.fill(text);
    await this.postCommentButton.focus();
    await this.postCommentButton.press('Enter');
    await this.page.getByText(text, { exact: true }).waitFor({ state: 'visible' });
  }

  public async deleteComment(text: string): Promise<void> {
    const card = this.commentCards.filter({ hasText: text });
    await card.getByRole('button', { name: /delete/i }).click();
    await this.page.getByText(text, { exact: true }).waitFor({ state: 'detached' });
  }

  public async favoriteArticle(): Promise<void> {
    await this.favoriteButton.click();
    await this.unfavoriteButton.waitFor({ state: 'visible' });
  }

  public async unfavoriteArticle(): Promise<void> {
    await this.unfavoriteButton.click();
    await this.favoriteButton.waitFor({ state: 'visible' });
  }

  public async editArticle(): Promise<void> {
    await this.editButton.click();
  }

  public async deleteArticle(): Promise<void> {
    await this.deleteButton.click();
    await this.page.waitForURL(/\/#?\/?$/);
  }

  public async followAuthor(): Promise<void> {
    await this.followButton.click();
    await this.unfollowButton.waitFor({ state: 'visible' });
  }

  public async unfollowAuthor(): Promise<void> {
    await this.unfollowButton.click();
    await this.followButton.waitFor({ state: 'visible' });
  }
}
