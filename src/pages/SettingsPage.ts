import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page, '/settings');
  }

  public get bioInput(): Locator {
    return this.page.getByPlaceholder('Short bio about you');
  }

  public get imageInput(): Locator {
    return this.page.getByPlaceholder('URL of profile picture');
  }

  public get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Update Settings' });
  }

  public get logoutButton(): Locator {
    return this.page
      .getByRole('button', { name: /logout/i })
      .or(this.page.getByRole('button', { name: /click here to logout/i }));
  }

  public override async waitForPageLoad(): Promise<void> {
    await this.bioInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.submitButton.waitFor({ state: 'visible', timeout: 10_000 });
  }

  public async updateBio(bio: string): Promise<void> {
    await this.bioInput.fill(bio);
  }

  public async updateImage(url: string): Promise<void> {
    await this.imageInput.fill(url);
  }

  public async saveSettings(): Promise<void> {
    await this.submitButton.click();
    await this.submitButton.waitFor({ state: 'visible' });
  }

  public async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.header.signInLink.waitFor({ state: 'visible' });
  }
}
