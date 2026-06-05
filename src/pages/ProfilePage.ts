import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { testIds } from './test-ids';

export class ProfilePage extends BasePage {
  constructor(page: Page) {
    super(page, '');
  }

  public get usernameHeading(): Locator {
    return this.page.getByTestId(testIds.profileHeading);
  }

  public get bioParagraph(): Locator {
    return this.page.getByTestId(testIds.profileBio);
  }

  public get myArticlesTab(): Locator {
    return this.page
      .getByRole('link', { name: 'My Articles' })
      .or(this.page.getByRole('link', { name: 'My Posts' }));
  }

  public get favoritedArticlesTab(): Locator {
    return this.page.getByRole('link', { name: 'Favorited Articles' });
  }

  public get articleTitles(): Locator {
    return this.page.getByTestId(testIds.articleCard).getByRole('heading');
  }

  public get followButton(): Locator {
    return this.page.getByRole('button', { name: /^follow/i }).first();
  }

  public get unfollowButton(): Locator {
    return this.page.getByRole('button', { name: /^unfollow/i }).first();
  }

  public async navigateToUser(username: string): Promise<void> {
    await this.page.goto(`/profile/${username}`);
    await this.waitForPageLoad();
  }

  public async showMyArticles(): Promise<void> {
    await this.myArticlesTab.click();
    await this.profileArticlesReady();
  }

  public async showFavoriteArticles(): Promise<void> {
    await this.favoritedArticlesTab.click();
    await this.profileArticlesReady();
  }

  public async followUser(): Promise<void> {
    await this.followButton.click();
    await this.unfollowButton.waitFor({ state: 'visible' });
  }

  public async unfollowUser(): Promise<void> {
    await this.unfollowButton.click();
    await this.followButton.waitFor({ state: 'visible' });
  }

  private async profileArticlesReady(): Promise<void> {
    await this.page
      .getByTestId(testIds.articleCard)
      .or(this.page.getByText('No articles are here'))
      .first()
      .waitFor({ state: 'attached', timeout: 10_000 });
  }
}
