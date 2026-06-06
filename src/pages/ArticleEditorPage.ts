import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NotificationComponent } from './components/Notification.component';

export class ArticleEditorPage extends BasePage {
  private notifications: NotificationComponent;

  constructor(page: Page) {
    super(page, '/editor');
    this.notifications = new NotificationComponent(page);
  }

  public get titleInput(): Locator {
    return this.page.getByPlaceholder('Article Title');
  }

  public get descriptionInput(): Locator {
    return this.page.getByPlaceholder("What's this article about?");
  }

  public get bodyInput(): Locator {
    return this.page.getByPlaceholder('Write your article (in markdown)');
  }

  public get tagInput(): Locator {
    return this.page.getByPlaceholder('Enter tags');
  }

  public get publishButton(): Locator {
    return this.page.getByRole('button', { name: /publish|update/i });
  }

  public override async waitForPageLoad(): Promise<void> {
    await this.titleInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.publishButton.waitFor({ state: 'visible', timeout: 10_000 });
  }

  public async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  public async fillDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
  }

  public async fillBody(body: string): Promise<void> {
    await this.bodyInput.fill(body);
  }

  public async addTag(tag: string): Promise<void> {
    const currentValue = await this.tagInput.inputValue();
    await this.tagInput.fill([currentValue, tag].filter(Boolean).join(' '));
  }

  public async submit(): Promise<void> {
    await this.publishButton.click();
    await this.page.waitForURL(/\/article\/[^/]+$/);
  }

  public async update(): Promise<void> {
    await this.publishButton.click();
    await this.page.waitForURL(/\/article\/[^/]+$/);
  }

  public async getValidationErrors(): Promise<string[]> {
    return this.notifications.getValidationErrors();
  }
}
