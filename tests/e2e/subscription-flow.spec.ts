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
    await page.getByRole('button', { name: 'Subscribe to Annual Letter' }).click();
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
    await page.getByRole('button', { name: 'Subscribe to Annual Letter' }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Sign up as Bob
    await page.getByPlaceholder('your@email.com').fill(bobEmail);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('johndoe').fill(bobUsername);
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
    await page.getByRole('button', { name: 'Subscribe to Annual Letter' }).click();
    await logout(page);

    // Alice logs back in and checks subscribers
    await login(page, aliceEmail);

    // Click "View all" link in the Subscribers section
    const subscribersSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Subscribers' }) });
    await subscribersSection.getByRole('link', { name: 'View all' }).click();

    await expect(page.getByRole('heading', { name: 'Your Subscribers' })).toBeVisible();

    // Check that Bob appears in the subscriber list with his email
    const subscriberCard = page.locator('.subscriberCard, [class*="subscriberCard"]').filter({ hasText: 'Bob' });
    await expect(subscriberCard).toBeVisible();
    await expect(subscriberCard.getByText(bobEmail)).toBeVisible();
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
    await page.getByRole('button', { name: 'Subscribe to Annual Letter' }).click();
    await logout(page);

    // Alice logs back in and checks updates
    await login(page, aliceEmail);
    await page.goto('/updates');
    await expect(page.getByText('Bob subscribed to you')).toBeVisible();
  });

  test('manually added subscriber can decline subscription', async ({ page }) => {
    const aliceEmail = randomEmail();
    const aliceUsername = randomUsername();
    const bobEmail = randomEmail();
    const bobUsername = randomUsername();

    // Alice signs up
    await signUp(page, aliceEmail, aliceUsername, 'Alice');

    // Ensure we're on home page and fully logged in
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Alice' })).toBeVisible(); // Wait for Alice's profile link in banner

    // Alice manually adds Bob by email
    await page.goto('/subscribers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Your Subscribers' })).toBeVisible();
    await page.getByPlaceholder('email@example.com').fill(bobEmail);
    await page.getByPlaceholder('Full Name').fill('Bob Smith');
    await page.getByRole('button', { name: 'Add Subscriber' }).click();
    // Wait for Bob to appear in the subscriber list
    await expect(page.locator('.subscriberCard, [class*="subscriberCard"]').filter({ hasText: 'Bob Smith' })).toBeVisible();
    await logout(page);

    // Bob signs up with the same email
    await signUp(page, bobEmail, bobUsername, 'Bob');

    // Bob visits Alice's profile and should see confirmation prompt with both options
    await page.goto(`/${aliceUsername}`);
    await expect(page.getByText('Alice added you as a subscriber')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm Subscription' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Bob declines by clicking Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Should now show Subscribe button (Bob is no longer subscribed)
    await expect(page.getByRole('button', { name: 'Subscribe to Annual Letter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible();
  });

  test('manually added subscriber can confirm then later unsubscribe', async ({ page }) => {
    const aliceEmail = randomEmail();
    const aliceUsername = randomUsername();
    const bobEmail = randomEmail();
    const bobUsername = randomUsername();

    // Alice signs up and manually adds Bob
    await signUp(page, aliceEmail, aliceUsername, 'Alice');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Alice' })).toBeVisible();

    await page.goto('/subscribers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Your Subscribers' })).toBeVisible();
    await page.getByPlaceholder('email@example.com').fill(bobEmail);
    await page.getByPlaceholder('Full Name').fill('Bob Smith');
    await page.getByRole('button', { name: 'Add Subscriber' }).click();
    await expect(page.locator('.subscriberCard, [class*="subscriberCard"]').filter({ hasText: 'Bob Smith' })).toBeVisible();
    await logout(page);

    // Bob signs up and confirms the subscription
    await signUp(page, bobEmail, bobUsername, 'Bob');
    await page.goto(`/${aliceUsername}`);
    await expect(page.getByText('Alice added you as a subscriber')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Subscription' }).click();

    // After confirming, Bob should see the Subscribed button and Unsubscribe option
    await expect(page.getByRole('button', { name: 'Subscribed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unsubscribe' })).toBeVisible();

    // Bob later decides to unsubscribe
    page.on('dialog', dialog => dialog.accept()); // Accept the confirmation dialog
    await page.getByRole('button', { name: 'Unsubscribe' }).click();

    // Should now show Subscribe button again
    await expect(page.getByRole('button', { name: 'Subscribe to Annual Letter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unsubscribe' })).not.toBeVisible();
  });
});
