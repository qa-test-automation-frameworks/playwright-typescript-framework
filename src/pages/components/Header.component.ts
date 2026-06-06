import { Page, Locator } from '@playwright/test';
import { testIds } from '../test-ids';

export class HeaderComponent {
  constructor(private page: Page) {}

  public get homeLink(): Locator {
    return this.page.getByRole('link', { name: 'Home' });
  }

  public get newArticleLink(): Locator {
    return this.page
      .getByRole('link', { name: 'New Post' })
      .or(this.page.getByRole('link', { name: 'New Article' }));
  }

  public get settingsLink(): Locator {
    return this.page.getByRole('link', { name: 'Settings' });
  }

  public get signInLink(): Locator {
    return this.page.getByRole('link', { name: 'Sign in' });
  }

  public get signUpLink(): Locator {
    return this.page.getByRole('link', { name: 'Sign up' });
  }

  public get profileLink(): Locator {
    return this.page.getByTestId(testIds.profileLink);
  }

  public async navigateToHome(): Promise<void> {
    await this.activateLink(this.homeLink);
  }

  public async navigateToNewArticle(): Promise<void> {
    await this.activateLink(this.newArticleLink);
  }

  public async navigateToSettings(): Promise<void> {
    await this.activateLink(this.settingsLink);
  }

  public async navigateToProfile(): Promise<void> {
    await this.activateLink(this.profileLink);
  }

  private async activateLink(link: Locator): Promise<void> {
    await link.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}
