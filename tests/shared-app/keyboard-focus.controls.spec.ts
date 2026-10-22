import { expect, test, type Locator, type Page } from '@playwright/test';

async function startSession(page: Page, identity: 'member-a' | 'reviewer'): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Sign in as').selectOption(identity);
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.locator('#session-status')).toContainText('Active as');
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

async function tabUntilFocused(
  page: Page,
  target: Locator,
  maximumSteps: number,
): Promise<boolean> {
  for (let step = 0; step < maximumSteps; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return true;
    await page.keyboard.press('Tab');
  }
  return target.evaluate((element) => element === document.activeElement);
}

async function expectInjectedFaultToFailContract(
  contractName: string,
  check: () => Promise<void>,
): Promise<void> {
  let failure: unknown;
  try {
    await check();
  } catch (error) {
    failure = error;
  }
  expect(failure, `${contractName} should fail against the injected regression`).toBeInstanceOf(
    Error,
  );
  const escapeCharacter = String.fromCharCode(27);
  const ansiControlSequence = new RegExp(`${escapeCharacter}\\[[0-?]*[ -/]*[@-~]`, 'gu');
  const assertionMessage = (failure as Error).message.replace(ansiControlSequence, '');
  expect(assertionMessage).toMatch(/Expected:\s*true[\s\S]*Received:\s*false/u);
}

test('tabindex -1 on the submit control is caught by the keyboard reachability control @keyboard-focus-control', async ({
  page,
}) => {
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const mutated = original.replace(
      '<button type="submit">Submit claim</button>',
      '<button type="submit" tabindex="-1">Submit claim</button>',
    );
    if (mutated === original)
      throw new Error('The submit-control mutation did not match the page.');
    await route.fulfill({ response, body: mutated });
  });
  await startSession(page, 'member-a');

  const submitButton = page.getByRole('button', { name: 'Submit claim' });
  await expect(submitButton).toHaveAttribute('tabindex', '-1');
  await expectInjectedFaultToFailContract('keyboard submit reachability', async () => {
    expect(await tabUntilFocused(page, submitButton, 12)).toBe(true);
  });
});

test('removing row focus restoration is caught after a reviewer update @keyboard-focus-control', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const nativeFocus = Reflect.get<HTMLElement, 'focus'>(HTMLElement.prototype, 'focus');
    HTMLElement.prototype.focus = function patchedFocus(
      this: HTMLElement,
      options?: FocusOptions,
    ): void {
      if (this.matches('tr[data-claim-id], button[data-claim-action]')) return;
      Reflect.apply(nativeFocus, this, [options]);
    };
  });
  const claimId = await createClaimThroughPublicApi(page);
  await startSession(page, 'reviewer');

  const claimRow = page.locator(`#claims-body tr[data-claim-id="${claimId}"]`);
  const underReviewButton = claimRow.getByRole('button', { name: 'Set under review' });
  expect(await tabUntilFocused(page, underReviewButton, 64)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('#notice')).toContainText('moved to under review');

  const nextAction = claimRow.getByRole('button', { name: 'Set approved' });
  await expect(nextAction).toBeAttached();
  await expectInjectedFaultToFailContract('reviewer row focus restoration', async () => {
    expect(await nextAction.evaluate((element) => element === document.activeElement)).toBe(true);
  });
});
