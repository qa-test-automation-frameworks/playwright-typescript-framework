import { apiFixtures } from './api.fixtures';
import { FeedPage } from '../pages/FeedPage';
import { ArticleEditorPage } from '../pages/ArticleEditorPage';
import { ArticlePage } from '../pages/ArticlePage';
import { AuthPage } from '../pages/AuthPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ProfilePage } from '../pages/ProfilePage';

export type PageFixtures = {
  feedPage: FeedPage;
  articleEditorPage: ArticleEditorPage;
  articlePage: ArticlePage;
  authPage: AuthPage;
  settingsPage: SettingsPage;
  profilePage: ProfilePage;
};

export const pageFixtures = apiFixtures.extend<PageFixtures>({
  feedPage: async ({ page }, use) => {
    await use(new FeedPage(page));
  },

  articleEditorPage: async ({ page }, use) => {
    await use(new ArticleEditorPage(page));
  },

  articlePage: async ({ page }, use) => {
    await use(new ArticlePage(page));
  },

  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
});
