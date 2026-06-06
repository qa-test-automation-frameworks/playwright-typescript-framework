import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { ArticleCardComponent } from './components/ArticleCard.component';
import { testIds } from './test-ids';

export class FeedPage extends BasePage {
  constructor(page: Page) {
    super(page, '/');
  }

  public get yourFeedTab(): Locator {
    return this.page.getByRole('link', { name: 'Your Feed' });
  }

  public get globalFeedTab(): Locator {
    return this.page.getByRole('link', { name: 'Global Feed' });
  }

  public get articleCards(): Locator {
    return this.page.getByTestId(testIds.articleCard);
  }

  public get tagLinks(): Locator {
    return this.page.getByTestId(testIds.articleTag);
  }

  public articleCard(title: string): Locator {
    return this.articleCards.filter({ hasText: title });
  }

  public async switchToPersonalFeed(): Promise<void> {
    await this.yourFeedTab.click();
    await this.waitForActiveFeedTab('Your Feed');
  }

  public async switchToGlobalFeed(): Promise<void> {
    await this.globalFeedTab.click();
    await this.waitForActiveFeedTab('Global Feed');
  }

  public async getArticleCount(): Promise<number> {
    await this.feedContentReady();
    return this.articleCards.count();
  }

  public async clickArticle(title: string): Promise<void> {
    const articleLink = this.articleCardForTitle(title).articleLinkForTitle(title);
    await articleLink.focus();
    await articleLink.press('Enter');
  }

  public async clickTagFilter(tag: string): Promise<void> {
    await this.page.getByRole('link', { name: tag }).click();
    await this.feedContentReady();
  }

  public async favoriteArticle(title: string): Promise<void> {
    await this.articleCardForTitle(title).favorite();
  }

  public favoriteButtonForArticle(title: string): Locator {
    return this.articleCardForTitle(title).favoriteBtn;
  }

  public override async waitForPageLoad(): Promise<void> {
    await this.feedContentReady();
  }

  private articleCardForTitle(title: string): ArticleCardComponent {
    return new ArticleCardComponent(this.articleCard(title));
  }

  private async feedContentReady(): Promise<void> {
    await this.articleCards
      .or(this.page.getByText('No articles are here'))
      .first()
      .waitFor({ state: 'attached', timeout: 10_000 });
  }

  private async waitForActiveFeedTab(tabName: string): Promise<void> {
    await this.page
      .getByRole('link', { name: tabName })
      .waitFor({ state: 'visible', timeout: 10_000 });
  }
}
