import { expect, test } from '@playwright/test';
import { readFile } from 'fs/promises';

function randomEmail() {
  const id = Math.random().toString(36).slice(2, 10);
  return `${id}@slowpost.test`;
}

function randomUsername() {
  return `user${Math.random().toString(36).slice(2, 10)}`;
}

test('new user can sign up and log back in without sending PIN emails when SKIP_PIN is enabled', async ({ page }) => {
  const email = randomEmail();
  const username = randomUsername();
  const fullName = 'Playwright Tester';

  await page.goto('/');
  await page.getByRole('link', { name: 'Get Started' }).click();

  await expect(page).toHaveURL(/\/login/);

  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Create your account')).toBeVisible();
  await expect(page.getByText('Development PIN')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip PIN (localhost only)' })).toBeVisible();

  await page.getByPlaceholder('Username (e.g., johndoe)').fill(username);
  await page.getByPlaceholder('Full Name').fill(fullName);
  await page.getByRole('button', { name: 'Skip PIN (localhost only)' }).click();

  await page.waitForURL('**/');
  await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${fullName}!`) })).toBeVisible();

  await page.getByRole('button', { name: 'Log Out' }).click();
  await page.waitForURL('**/');
  await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();

  await page.getByRole('link', { name: 'Get Started' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText(`Enter the PIN sent to ${email}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip PIN (localhost only)' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip PIN (localhost only)' }).click();

  await page.waitForURL('**/');
  await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${fullName}!`) })).toBeVisible();

  const logPath = process.env.PLAYWRIGHT_POSTMARK_LOG;
  expect(logPath).toBeTruthy();
  if (logPath) {
    const contents = await readFile(logPath, 'utf8');
    const events = JSON.parse(contents);
    expect(events).toEqual([]);
  }
});
