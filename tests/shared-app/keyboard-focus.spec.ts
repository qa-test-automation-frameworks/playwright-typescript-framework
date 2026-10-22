import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

type Identity = 'member-a' | 'member-b' | 'reviewer';

async function startSessionWithKeyboard(page: Page, identity: Identity): Promise<void> {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Tab');

  const identitySelect = page.getByLabel('Sign in as');
  await expect(identitySelect).toBeFocused();
  const arrowMoves = identity === 'reviewer' ? 2 : identity === 'member-b' ? 1 : 0;
  if (identity === 'member-a') {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
  } else {
    for (let index = 0; index < arrowMoves; index += 1) {
      await page.keyboard.press('ArrowDown');
    }
  }
  await expect(identitySelect).toHaveValue(identity);

  await page.keyboard.press('Tab');
  const startButton = page.getByRole('button', { name: 'Start session' });
  await expect(startButton).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('#session-status')).toContainText('Active as');
  await expect(page.locator('#session-status')).not.toHaveAttribute('role');
  await expect(page.locator('#session-status')).not.toHaveAttribute('aria-live');
  await expect(page.getByRole('status')).toHaveCount(1);
  await expect(page.locator('#notice')).toHaveText(
    'Session started. Data is scoped to this application run.',
  );
  await expect(
    page.locator(identity === 'reviewer' ? '#claims-heading' : '#claim-form-heading'),
  ).toBeFocused();
}

async function expectAccessible(page: Page): Promise<void> {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    accessibility.violations.map(({ id, impact }) => ({ id, impact })),
    JSON.stringify(accessibility.violations.map(({ id, impact }) => ({ id, impact }))),
  ).toEqual([]);
}

async function expectVisibleFocus(locator: Locator): Promise<void> {
  const outline = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline).toEqual({ style: 'solid', width: '3px' });
}

async function tabUntilFocused(
  page: Page,
  target: Locator,
  direction: 'forward' | 'backward',
  maximumSteps: number,
): Promise<boolean> {
  for (let step = 0; step < maximumSteps; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return true;
    await page.keyboard.press(direction === 'forward' ? 'Tab' : 'Shift+Tab');
  }
  return target.evaluate((element) => element === document.activeElement);
}

async function createClaimThroughPublicApi(page: Page): Promise<string> {
  const baseUrl = process.env.SHARED_APP_BASE_URL;
  if (!baseUrl) throw new Error('SHARED_APP_BASE_URL must point to the pinned reference app.');

  const sessionResponse = await page.request.post(new URL('/api/v1/sessions', baseUrl).toString(), {
    data: { identityKey: 'member-a' },
  });
  expect(sessionResponse.status()).toBe(201);
  const session = (await sessionResponse.json()) as { token: string };
  const headers = { authorization: `Bearer ${session.token}` };
  const policiesResponse = await page.request.get(new URL('/api/v2/policies', baseUrl).toString(), {
    headers,
  });
  expect(policiesResponse.status()).toBe(200);
  const policies = (await policiesResponse.json()) as { items: Array<{ id: string }> };
  const policyId = policies.items[0]?.id;
  expect(policyId).toBeTruthy();

  const claimResponse = await page.request.post(new URL('/api/v2/claims', baseUrl).toString(), {
    headers,
    data: { policyId, amountMinor: 3741, currency: 'USD', category: 'auto' },
  });
  expect(claimResponse.status()).toBe(201);
  const claim = (await claimResponse.json()) as { claim: { id: string } };
  return claim.claim.id;
}

test('keyboard users can submit a claim and land on its exact row', async ({ page }, testInfo) => {
  const requestPaths: string[] = [];
  let claimPostCount = 0;
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    requestPaths.push(path);
    if (path === '/api/v2/claims' && request.method() === 'POST') {
      claimPostCount += 1;
    }
  });

  await startSessionWithKeyboard(page, 'member-a');
  await expectAccessible(page);
  await expect(page.locator('#policy-section')).toBeVisible();
  await expect(page.locator('#claim-form-section')).toBeVisible();
  await expect(page.locator('#claims-body button')).toHaveCount(0);

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Policy')).toBeFocused();
  await page.keyboard.press('Tab');
  const amount = page.getByLabel('Requested amount (USD)');
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute('aria-describedby', 'amount-limit-help');
  await expect(amount).toHaveAttribute('max', '5000.00');
  await page.keyboard.type('5000.01');

  await page.keyboard.press('Tab');
  const category = page.getByLabel('Category');
  await expect(category).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await expect(category).toHaveValue('auto');

  await page.keyboard.press('Tab');
  const submitButton = page.getByRole('button', { name: 'Submit claim' });
  await expect(submitButton).toBeFocused();
  await expectVisibleFocus(submitButton);
  expect(await amount.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false);
  await page.keyboard.press('Enter');
  await expect(amount).toBeFocused();
  expect(claimPostCount).toBe(0);

  await page.keyboard.press('Control+A');
  await page.keyboard.type('37.41');
  await page.keyboard.press('Tab');
  await expect(category).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await expect(category).toHaveValue('auto');
  await page.keyboard.press('Tab');
  await expect(submitButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(category).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(submitButton).toBeFocused();

  const box = await submitButton.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!box || !viewport) throw new Error('The focused submit button must fit in the browser view.');
  const x = Math.max(0, box.x - 10);
  const y = Math.max(0, box.y - 10);
  const screenshot = await page.screenshot({
    path: testInfo.outputPath('keyboard-submit-focus.png'),
    clip: {
      x,
      y,
      width: Math.min(viewport.width - x, box.width + 20),
      height: Math.min(viewport.height - y, box.height + 20),
    },
  });
  expect(screenshot.byteLength).toBeGreaterThan(500);

  const createResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return new URL(response.url()).pathname === '/api/v2/claims' && request.method() === 'POST';
  });
  await page.keyboard.press('Enter');
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const postedClaim = createResponse.request().postDataJSON() as {
    amountMinor: number;
    category: string;
    currency: string;
  };
  expect(postedClaim).toMatchObject({ amountMinor: 3741, category: 'auto', currency: 'USD' });
  expect(claimPostCount).toBe(1);
  const responseBody = (await createResponse.json()) as { claim: { id: string } };
  const claimId = responseBody.claim.id;
  await expect(page.locator('#notice')).toHaveText('The claim was submitted and persisted.');

  const row = page.locator(`#claims-body tr[data-claim-id="${claimId}"]`);
  await expect(row).toBeFocused();
  await expect(row).toHaveAttribute('tabindex', '-1');
  await expect(row).toHaveAttribute('aria-label', new RegExp(`Claim ${claimId}`));
  expect(requestPaths).toContain('/api/v1/sessions');
  expect(requestPaths).toContain('/api/v2/claims');
});

test('keyboard reviewer actions keep focus on the same claim and sign out cleanly', async ({
  page,
}) => {
  const claimId = await createClaimThroughPublicApi(page);
  await startSessionWithKeyboard(page, 'reviewer');
  await expectAccessible(page);
  await expect(page.locator('#policy-section')).toBeHidden();
  await expect(page.locator('#claim-form-section')).toBeHidden();

  const claimRow = page.locator(`#claims-body tr[data-claim-id="${claimId}"]`);
  const underReviewButton = claimRow.getByRole('button', { name: 'Set under review' });
  expect(await tabUntilFocused(page, underReviewButton, 'forward', 48)).toBe(true);
  await expect(underReviewButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#notice')).toContainText('moved to under review');

  const approveButton = claimRow.getByRole('button', { name: 'Set approved' });
  await expect(approveButton).toBeFocused();
  await expectVisibleFocus(approveButton);
  await page.keyboard.press('Space');
  await expect(page.locator('#notice')).toContainText('moved to approved');
  await expect(claimRow).toBeFocused();
  await expectVisibleFocus(claimRow);

  const endSession = page.getByRole('button', { name: 'End session' });
  expect(await tabUntilFocused(page, endSession, 'backward', 48)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Sign in as')).toBeFocused();
  await expect(page.locator('#session-status')).toHaveText('No session is active.');
});

test('a failed claim request focuses the alert and preserves a keyboard retry', async ({
  page,
}) => {
  await startSessionWithKeyboard(page, 'member-a');

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const amount = page.getByLabel('Requested amount (USD)');
  await page.keyboard.type('37.41');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const submitButton = page.getByRole('button', { name: 'Submit claim' });
  await expect(submitButton).toBeFocused();

  let attempts = 0;
  let forwardedRequests = 0;
  await page.route('**/api/v2/claims', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'A temporary service interruption occurred.' } }),
      });
      return;
    }
    forwardedRequests += 1;
    await route.continue();
  });

  await page.keyboard.press('Enter');
  const error = page.locator('#error');
  await expect(error).toHaveText('A temporary service interruption occurred.');
  await expect(error).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('');
  await expect(amount).toHaveValue('37.41');
  await expect(submitButton).toBeEnabled();
  await expectAccessible(page);

  await page.keyboard.press('Shift+Tab');
  await expect(submitButton).toBeFocused();
  const retryResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return (
      new URL(response.url()).pathname === '/api/v2/claims' &&
      request.method() === 'POST' &&
      response.status() === 201
    );
  });
  await page.keyboard.press('Enter');
  const retryResponse = await retryResponsePromise;
  const responseBody = (await retryResponse.json()) as { claim: { id: string } };
  expect(attempts).toBe(2);
  expect(forwardedRequests).toBe(1);

  const createdRow = page.locator(`#claims-body tr[data-claim-id="${responseBody.claim.id}"]`);
  await expect(createdRow).toHaveCount(1);
  await expect(createdRow).toBeFocused();
});
