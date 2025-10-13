# End-to-End Testing Guide

This project uses [Playwright](https://playwright.dev/) for end-to-end (E2E) tests. The suites live in `tests/e2e` and run against a local Next.js instance that the Playwright test runner starts automatically. This guide covers the most common workflows for adding and running tests.

## Prerequisites

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Install the Playwright browsers (run once per environment):

   ```bash
   npx playwright install
   ```

## Running the full suite

Run every E2E test against the default browser matrix (Chromium, Firefox, and WebKit):

```bash
yarn test:e2e
```

The command boots the application with `yarn dev` under the hood and tears everything down once the run is complete. Logs and temporary assets (including a stubbed Postmark log) are stored in a per-run directory under your system temp folder.

To watch the flow in a real browser window, run the slow-mode variant. It enables headed Chromium and adds a short delay between actions so you can follow along:

```bash
yarn test:e2e:slow
```

## Running an individual test file

Pass the path to the spec you want to run. Paths can be absolute or relative to the repository root:

```bash
yarn test:e2e tests/e2e/auth-flow.spec.ts
```

You can also use Playwright's `--grep` flag to run tests whose names match a pattern:

```bash
yarn test:e2e -- --grep "password"
```

## Choosing browsers

The Playwright configuration defines projects for Chromium, Firefox, and WebKit. You can target one or more projects with the `--project` flag:

```bash
# Only Chromium
yarn test:e2e -- --project=chromium

# Chromium and Firefox
yarn test:e2e -- --project=chromium --project=firefox
```

If you skip the flag, the command runs against the entire browser matrix.

## Adding a new test

1. Create a new spec file in `tests/e2e` (or a nested directory). Spec files conventionally use the `.spec.ts` suffix. For example:

   ```text
   tests/
     e2e/
       onboarding.spec.ts
   ```

2. Import helpers from `@playwright/test` and write your scenarios. The existing `auth-flow.spec.ts` demonstrates how to stub network behavior and assert on the UI.

3. Commit the new spec along with any supporting fixtures or stubs. Place reusable test data in `tests/e2e/stubs/`.

4. Run the suite (or the individual spec) to ensure it passes in the target browsers.

## Environment notes

- The Playwright runner uses `tests/e2e/global-teardown.ts` to clean up temporary files after every run.
- The config sets `SKIP_PIN`, `TURSO_URL`, and Postmark-related variables so that tests operate against local, transient resources. You should not need to export any environment variables manually.
- When updating the test server behavior, remember that the E2E suite launches `yarn dev`. Ensure your changes work in development mode.

Refer to the [Playwright CLI docs](https://playwright.dev/docs/test-cli) for additional options such as tracing, headed mode, or debugging.
