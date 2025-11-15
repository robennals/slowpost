import { Page, expect } from '@playwright/test';

export function randomEmail() {
  const id = Math.random().toString(36).slice(2, 10);
  return `${id}@slowpost.test`;
}

export function randomUsername() {
  return `user${Math.random().toString(36).slice(2, 10)}`;
}

export async function signUp(page: Page, email: string, username: string, fullName: string) {
  await page.goto('/login');
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Create your account')).toBeVisible();
  await page.getByPlaceholder('johndoe').fill(username);
  await page.getByPlaceholder('Full Name').fill(fullName);
  await page.getByRole('button', { name: 'Skip PIN (localhost only)' }).click();

  await page.waitForURL('**/');
  await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${fullName}!`) })).toBeVisible();
}

export async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip PIN (localhost only)' }).click();
  await page.waitForURL('**/');
  // Wait for auth to be fully established
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log Out' }).click();
  await page.waitForURL('**/');
  await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
}
