# slowpost

The least addictive social network - Post Once a Year.

## Development

This repository is organised as a Yarn workspaces monorepo:

* `packages/server` contains a TypeScript Express API with an in-memory datastore that mirrors the product design in `docs/overview.md`.
* `packages/client` contains a Next.js app with React components and Storybook stories for each screen described in the overview.

### Useful commands

```bash
# Install dependencies
yarn install

# Run all server Vitest suites and the component tests that reuse the Storybook stories.
yarn test

# Develop the Next.js site
yarn workspace @slowpost/client dev

# Run Storybook locally
yarn workspace @slowpost/client storybook
```
