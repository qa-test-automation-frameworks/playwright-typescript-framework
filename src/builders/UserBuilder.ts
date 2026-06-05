import { faker } from '@faker-js/faker';
import { RegisterRequest } from '../api/models/auth.model';

const TEST_RUN_ID = (process.env.TEST_RUN_ID || `local-${Date.now()}`)
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, 16);

export class UserBuilder {
  private username = `u${TEST_RUN_ID}${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`;
  private email = `testuser.${TEST_RUN_ID}.${faker.string.alphanumeric({ length: 8, casing: 'lower' })}@example.test`;
  private password = 'TestUser123!' + faker.string.alphanumeric(5);

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withEmail(email: string): this {
    this.email = email;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public build(): RegisterRequest {
    return {
      user: {
        username: this.username,
        email: this.email,
        password: this.password,
      },
    };
  }
}
