import { Locator } from '@playwright/test';
import { testIds } from '../test-ids';

export class ArticleCardComponent {
  constructor(private root: Locator) {}

  public get authorLink(): Locator {
    return this.root.getByTestId(testIds.articleAuthor);
  }

  public get titleHeading(): Locator {
    return this.root.getByTestId(testIds.articleTitle);
  }

  public articleLinkForTitle(title: string): Locator {
    return this.root.getByRole('link').filter({ hasText: title });
  }

  public get descriptionParagraph(): Locator {
    return this.root.getByTestId(testIds.articleDescription);
  }

  public get dateText(): Locator {
    return this.root.getByTestId(testIds.articleDate);
  }

  public get favoriteBtn(): Locator {
    return this.root.getByRole('button', { name: /^(Favorite|Unfavorite)\b/i });
  }

  public async click(): Promise<void> {
    await this.titleHeading.click();
  }

  public async favorite(): Promise<void> {
    await this.favoriteBtn.click();
  }
}
