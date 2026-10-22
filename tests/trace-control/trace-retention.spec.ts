import { expect, test } from '@playwright/test';

test('synthetic failure retains a trace after the expected action', async ({ page }) => {
  await page.setContent(
    '<main><button type="button" id="trace-control-button">Trace control action</button><p id="result">not clicked</p></main>',
  );

  await test.step('trace-control-expected-action', async () => {
    await page.getByRole('button', { name: 'Trace control action' }).click();
    await page.locator('#result').evaluate((element) => {
      element.textContent = 'clicked';
    });
  });

  await test.step('trace-control-expected-assertion', async () => {
    await expect(page.getByRole('heading', { name: 'Expected synthetic heading' })).toBeVisible();
  });
});

test('synthetic passing control leaves no retained trace', async ({ page }) => {
  await page.setContent('<main><h1>Trace control passed</h1></main>');
  await expect(page.getByRole('heading', { name: 'Trace control passed' })).toBeVisible();
});
