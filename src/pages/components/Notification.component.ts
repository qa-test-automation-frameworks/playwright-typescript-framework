import { Page, Locator } from '@playwright/test';
import { testIds } from '../test-ids';

export class NotificationComponent {
  constructor(private page: Page) {}

  public get errorContainer(): Locator {
    return this.page.getByTestId(testIds.errors);
  }

  public get errorItems(): Locator {
    return this.page.getByTestId(testIds.errorItem);
  }

  public async getValidationErrors(): Promise<string[]> {
    try {
      await this.errorContainer.waitFor({ state: 'visible', timeout: 5000 });
    } catch (error) {
      throw new Error(
        `Validation error container did not become visible within 5000ms. Current page URL: ${this.page.url()}. Original error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const texts = await this.errorItems.allTextContents();
    return texts.map((t) => t.trim());
  }
}
