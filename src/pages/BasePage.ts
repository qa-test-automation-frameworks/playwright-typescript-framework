import { Page } from '@playwright/test';
import { HeaderComponent } from './components/Header.component';

export abstract class BasePage {
  public header: HeaderComponent;

  constructor(
    protected page: Page,
    protected urlPath: string = '',
  ) {
    this.header = new HeaderComponent(page);
  }

  public async navigate(): Promise<void> {
    await this.page.goto(this.urlPath);
    await this.waitForPageLoad();
  }

  public async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  public async getTitle(): Promise<string> {
    return this.page.title();
  }

  public getUrl(): string {
    return this.page.url();
  }
}
