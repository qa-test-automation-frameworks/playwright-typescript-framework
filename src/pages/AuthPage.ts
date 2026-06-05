import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NotificationComponent } from './components/Notification.component';
import { LoginRequest, RegisterRequest } from '../api/models/auth.model';

export class AuthPage extends BasePage {
  private notifications: NotificationComponent;

  constructor(page: Page) {
    super(page, '/login');
    this.notifications = new NotificationComponent(page);
  }

  public get usernameInput(): Locator {
    return this.page.getByPlaceholder('Username');
  }

  public get emailInput(): Locator {
    return this.page.getByPlaceholder('Email');
  }

  public get passwordInput(): Locator {
    return this.page.getByPlaceholder('Password');
  }

  public get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign in' });
  }

  public get signUpButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign up' });
  }

  public get validationErrors(): Locator {
    return this.notifications.errorContainer;
  }

  public async navigateToLogin(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  public async navigateToRegister(): Promise<void> {
    await this.page.goto('/register');
    await this.waitForPageLoad();
  }

  public async loginUser(credentials: LoginRequest): Promise<void> {
    await this.emailInput.fill(credentials.user.email);
    await this.passwordInput.fill(credentials.user.password);
    await this.signInButton.click();
  }

  public async registerUser(user: RegisterRequest): Promise<void> {
    await this.usernameInput.fill(user.user.username);
    await this.emailInput.fill(user.user.email);
    await this.passwordInput.fill(user.user.password);
    await this.signUpButton.click();
  }

  public async getValidationErrors(): Promise<string[]> {
    return this.notifications.getValidationErrors();
  }

  public isOnLoginPage(): boolean {
    return this.getUrl().includes('/login');
  }

  public isOnRegisterPage(): boolean {
    return this.getUrl().includes('/register');
  }
}
