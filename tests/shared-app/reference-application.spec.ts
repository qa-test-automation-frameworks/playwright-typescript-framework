import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const amountForLifecycle = '37.41';
const amountForIsolation = '58.27';

async function startSession(
  page: Page,
  identity: 'member-a' | 'member-b' | 'reviewer',
): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Sign in as').selectOption(identity);
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Active as' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Claims' })).toBeVisible();
}

async function submitClaim(page: Page, amount: string): Promise<string> {
  await page.getByLabel('Requested amount (USD)').fill(amount);
  await page.getByLabel('Category').selectOption('auto');
  await page.getByRole('button', { name: 'Submit claim' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'claim was submitted' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: `$${amount}` });
  await expect(row).toContainText('submitted');
  return (await row.locator('td').first().innerText()).trim();
}

async function withFreshPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  return { context, page: await context.newPage() };
}

test('member submits a claim and a reviewer completes its lifecycle', async ({ page }) => {
  await startSession(page, 'member-a');
  const claimId = await submitClaim(page, amountForLifecycle);

  await page.getByRole('button', { name: 'End session' }).click();
  await startSession(page, 'reviewer');
  let claimRow = page.getByRole('row').filter({ hasText: claimId });
  await expect(claimRow).toContainText('submitted');
  await claimRow.getByRole('button', { name: 'Set under review' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'moved to under review' })).toBeVisible();

  claimRow = page.getByRole('row').filter({ hasText: claimId });
  await claimRow.getByRole('button', { name: 'Set approved' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'moved to approved' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: claimId })).toContainText('approved');
});

test('two concurrent member contexts keep claim visibility isolated', async ({ browser }) => {
  const [memberA, memberB] = await Promise.all([withFreshPage(browser), withFreshPage(browser)]);
  const contexts: BrowserContext[] = [memberA.context, memberB.context];
  try {
    await Promise.all([
      startSession(memberA.page, 'member-a'),
      startSession(memberB.page, 'member-b'),
    ]);
    const claimId = await submitClaim(memberA.page, amountForIsolation);

    await expect(memberA.page.getByRole('row').filter({ hasText: claimId })).toContainText(
      'submitted',
    );
    await expect(memberB.page.getByRole('row').filter({ hasText: claimId })).toHaveCount(0);
    await expect(memberB.page.getByRole('heading', { name: 'Claims' })).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('landing page passes an accessibility scan and captures a review screenshot', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Policy and claims' })).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    accessibility.violations,
    JSON.stringify(accessibility.violations.map(({ id, impact }) => ({ id, impact }))),
  ).toEqual([]);

  const screenshot = await page.screenshot({
    path: testInfo.outputPath('reference-app-landing.png'),
    fullPage: true,
  });
  expect(screenshot.byteLength).toBeGreaterThan(1_000);
});

test('accessible-name mutation is caught by the sign-in selector contract', async ({ page }) => {
  await page.route('**', async (route) => {
    if (new URL(route.request().url()).pathname !== '/') return route.continue();
    const response = await route.fetch();
    const html = (await response.text()).replace('Sign in as', 'Choose identity');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/');

  await expect(page.getByLabel('Sign in as')).toHaveCount(0);
  await expect(page.getByLabel('Choose identity')).toBeVisible();
});
