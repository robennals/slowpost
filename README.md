# Slowpost

A social networking app for connecting meaningfully with close friends and communities.

## Features

- **Email + PIN Authentication**: Secure login with email verification
- **Skip PIN on localhost**: Development mode allows quick login without PIN verification
- **User Profiles**: Create and customize your profile with username, full name, and bio
- **Groups**: Create and join private or public groups
- **Followers**: Follow friends and mark close relationships
- **Updates Feed**: Stay informed about new followers and group activities

## Tech Stack

- **Frontend**: Next.js 14 with React, TypeScript, and CSS Modules
- **Backend**: Next.js API routes on the Node.js runtime
- **Database**: SQLite with a custom adapter layer
- **Dev Tools**: Storybook for component development, Vitest for testing

## Project Structure

```
slowpost/
├── src/
│   ├── app/          # Next.js application routes
│   ├── components/   # Shared React components
│   ├── contexts/     # React context providers
│   ├── lib/          # Frontend utilities and API client
│   ├── server/       # Server logic reused by API routes
│   └── shared/       # Shared TypeScript types
├── tests/server/     # Vitest suites covering server logic
├── docs/             # Documentation
└── scripts/          # Tooling helpers (e.g. deploy to Vercel)
```

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn

### Installation

1. Install dependencies:
```bash
yarn install
```

2. Start the development server:
```bash
yarn dev
```

### Access the App

- **Client & API**: http://localhost:3000 (API mounted at `/api`)

### Development Mode

By default, the server runs with `SKIP_PIN=true`, which means:
- You can click "Skip PIN (localhost only)" button to bypass PIN verification
- PINs are logged to the console for testing
- This mode is only available in development

## Usage

### First Time Setup

1. Open http://localhost:3000
2. Click "Get Started" or "Log In | Sign Up"
3. Enter your email address
4. Since this is a new account, you'll be asked to create your profile
5. Enter a username and full name
6. In development mode, click "Skip PIN" or enter the PIN shown in the yellow box
7. You're now logged in!

### Logging In Again

1. Go to http://localhost:3000/login
2. Enter your email
3. Click "Skip PIN" in development mode
4. You're logged in!

## Architecture

### Database Adapter

The app uses a clean adapter pattern for database operations:

- `getDocument(collection, key)` - Retrieve a single document
- `addDocument(collection, key, data)` - Create a new document
- `updateDocument(collection, key, update)` - Update existing document
- `getChildLinks(collection, parentKey)` - Get all children in a relationship
- `getParentLinks(collection, childKey)` - Get all parents in a relationship
- `addLink(collection, parentKey, childKey, data)` - Create a relationship

This abstraction makes it easy to swap out the database implementation later if needed.

### Authentication Flow

1. User enters email → Server generates 6-digit PIN
2. PIN is sent via email (or shown in dev mode)
3. User enters PIN → Server verifies and creates session
4. Session token stored in httpOnly cookie
5. Client checks session on page load via `/api/auth/me`

## Scripts

- `yarn dev` - Start the Next.js dev server (client + API)
- `yarn build` - Create a production build
- `yarn start` - Run the production server
- `yarn test` - Execute Vitest suites
- `yarn lint` - Run ESLint
- `yarn typecheck` - Run TypeScript in no-emit mode
- `yarn storybook` - Launch Storybook
- `yarn build-storybook` - Build Storybook static assets

## Environment Variables

Create a `.env.local` file in the project root to configure server behaviour. Useful keys include:

```
SKIP_PIN=true
POSTMARK_API_KEY=your_key_here  # For production email sending
TURSO_URL=...
TURSO_AUTH_TOKEN=...
```

## Next Steps

Now that you have a working login system, you can incrementally add:

1. **Profile Pages**: View and edit user profiles
2. **Groups Feature**: Create and manage groups
3. **Followers System**: Follow other users
4. **Notifications**: Real-time updates
5. **Email Integration**: Configure Postmark for real PIN delivery

## License

MIT
