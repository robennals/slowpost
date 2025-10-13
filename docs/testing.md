# Testing overview

This project uses two complementary testing layers in addition to TypeScript type checking. The sections below describe what each layer covers, how the runners work, and which commands to use.

## Vitest suites (unit and server logic)

Run the Vitest test suites with:

```
corepack yarn test
```

This command exercises the unit and integration tests located in `tests/` using the configuration from `vitest.config.ts`. It is the quickest way to validate server logic and pure utilities because it runs in Node and uses jsdom only when individual specs request it.

## Storybook tests in a real browser

Run the Storybook regression suite in Chromium with:

```
corepack yarn test:storybook:browser
```

The `test:storybook:browser` script starts Storybook locally, waits for it to become available, and then hands control to the official Storybook test runner (`test-storybook`). That runner launches a headless Chromium instance to render each story and execute its `play` function just like the existing CI workflow. Use this mode whenever you need maximum fidelity with browser APIs, layout, or accessibility features such as `IntersectionObserver` that jsdom does not model well.

## Storybook tests under jsdom

Run the jsdom-based Storybook suite with:

```
corepack yarn test:storybook:jsdom
```

This command executes a Vitest suite that imports every story, renders it into a jsdom-powered DOM, and runs the corresponding `play` functions. The runner applies a shim so that Testing Library queries tolerate duplicate matches (matching the Storybook runner's behaviour) while keeping the feedback loop fast and fully in-process. This mode is useful for rapidly iterating on component logic, since it avoids the overhead of launching a full browser while still exercising Storybook stories end-to-end.

## Default Storybook script

For convenience, `corepack yarn test:storybook` runs the browser workflow by default. You can still opt into other modes by passing `--env` or `--mode` flags when calling the underlying script directly, but the dedicated scripts above should cover day-to-day usage.

## Playwright end-to-end tests

Run the Playwright suite against Chromium with:

```
corepack yarn test:e2e
```

This script targets the same headless configuration that runs in CI. Pass additional Playwright flags after `--` to forward them to the runner (for example, `corepack yarn test:e2e -- --project=firefox`).

When you need to inspect scenarios interactively, use the headed debug variant:

```
corepack yarn test:e2e:slow
```

The `test:e2e:slow` script makes the browser window visible and applies a 500 ms slow-motion delay to every interaction so that you can watch the flow play out step by step. Use this mode to investigate flakes or verify new flows before tightening assertions.
