import { expect, test } from '@playwright/test';
import { randomEmail, randomUsername, signUp, login, logout } from './helpers';

test.describe('Subscription flows', () => {
  test('user can subscribe to another user and see them in subscriptions list', async ({ page }) => {
    const aliceEmail = randomEmail();
    const aliceUsername = randomUsername();
    const bobEmail = randomEmail();
    const bobUsername = randomUsername();

    // Alice signs up
    await signUp(page, aliceEmail, aliceUsername, 'Alice');
    await logout(page);

    // Bob signs up and subscribes to Alice
    await signUp(page, bobEmail, bobUsername, 'Bob');

    // Navigate to Alice's profile
    await page.goto(`/${aliceUsername}`);
    await expect(page.getByRole('heading', { name: 'Alice', level: 1 })).toBeVisible();

    // Subscribe to Alice
    await page.getByRole('button', { name: 'Subscribe to Annual Post' }).click();
    await expect(page.getByRole('button', { name: 'Subscribed' })).toBeVisible();

    // Check subscriptions list on home page
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Subscriptions' })).toBeVisible();
    const subscriptionsSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Subscriptions' }) });
    await expect(subscriptionsSection.getByText('Alice')).toBeVisible();
    await expect(subscriptionsSection.getByText(`@${aliceUsername}`)).toBeVisible();
  });

  test('user can subscribe when not logged in and gets redirected back', async ({ page }) => {
    const aliceEmail = randomEmail();
    const aliceUsername = randomUsername();
    const bobEmail = randomEmail();
    const bobUsername = randomUsername();

    // Alice signs up
    await signUp(page, aliceEmail, aliceUsername, 'Alice');
    await logout(page);

    // Try to subscribe to Alice while logged out
    await page.goto(`/${aliceUsername}`);
    await page.getByRole('button', { name: 'Subscribe to Annual Post' }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Sign up as Bob
    await page.getByPlaceholder('your@email.com').fill(bobEmail);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Username (e.g., johndoe)').fill(bobUsername);
    await page.getByPlaceholder('Full Name').fill('Bob');
    await page.getByRole('button', { name: 'Skip PIN (localhost only)' }).click();

    // Should be redirected back to Alice's profile and subscribed
    await page.waitForURL(`**/${aliceUsername}`);
    await expect(page.getByRole('button', { name: 'Subscribed' })).toBeVisible();
  });

  test('subscriber shows up in user\'s subscribers list', async ({ page, context }) => {
    const aliceEmail = randomEmail();
    const aliceUsername = randomUsername();
    const bobEmail = randomEmail();
    const bobUsername = randomUsername();

    // Alice signs up
    await signUp(page, aliceEmail, aliceUsername, 'Alice');
    await logout(page);

    // Bob signs up and subscribes to Alice
    await signUp(page, bobEmail, bobUsername, 'Bob');
    await page.goto(`/${aliceUsername}`);
    await page.getByRole('button', { name: 'Subscribe to Annual Post' }).click();
    await logout(page);

    // Alice logs back in and checks subscribers
    await login(page, aliceEmail);

    // Click "View all" link in the Subscribers section
    const subscribersSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Subscribers' }) });
    await subscribersSection.getByRole('link', { name: 'View all' }).click();

    await expect(page.getByRole('heading', { name: 'Your Subscribers' })).toBeVisible();

    // Check that Bob appears in the subscriber list
    const subscriberCard = page.locator('.subscriberCard, [class*="subscriberCard"]').filter({ hasText: 'Bob' });
    await expect(subscriberCard).toBeVisible();
    await expect(subscriberCard.getByText(`@${bobUsername}`)).toBeVisible();
  });

  test('user sees updates when someone subscribes to them', async ({ page }) => {
    const aliceEmail = randomEmail();
    const aliceUsername = randomUsername();
    const bobEmail = randomEmail();
    const bobUsername = randomUsername();

    // Alice signs up
    await signUp(page, aliceEmail, aliceUsername, 'Alice');
    await logout(page);

    // Bob signs up and subscribes to Alice
    await signUp(page, bobEmail, bobUsername, 'Bob');
    await page.goto(`/${aliceUsername}`);
    await page.getByRole('button', { name: 'Subscribe to Annual Post' }).click();
    await logout(page);

    // Alice logs back in and checks updates
    await login(page, aliceEmail);
    await page.goto('/updates');
    await expect(page.getByText('Bob subscribed to you')).toBeVisible();
  });
});
