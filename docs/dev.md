# Local Development Setup

This guide will help you set up the Slowpost application for local development.

## Prerequisites

- Node.js 20+ and Yarn
- A Turso account (free tier is fine)
- Turso CLI installed

## Initial Setup

### 1. Install Dependencies

From the root of the repository:

```bash
yarn install
```

### 2. Install and Configure Turso CLI

Install the Turso CLI:

```bash
brew install tursodatabase/tap/turso
```

Login to Turso:

```bash
turso auth login
```

### 3. Create a Development Database

Create a new Turso database for local development:

```bash
turso db create slowpost-dev
```

Get your database URL:

```bash
turso db show slowpost-dev --url
```

This will output something like:
```
libsql://slowpost-dev-your-username.turso.io
```

Create an authentication token:

```bash
turso db tokens create slowpost-dev
```

This will output a long token string starting with `eyJ...`

### 4. Configure Environment Variables

#### Server Configuration

Create or update `/packages/server/.env`:

```bash
# Server port
PORT=3001

# Development mode - skips PIN verification
SKIP_PIN=true

# Node environment
NODE_ENV=development

# Turso Database Configuration
TURSO_DATABASE_URL=libsql://slowpost-dev-your-username.turso.io
TURSO_AUTH_TOKEN=eyJ...your-token-here...
```

**Important:** Replace the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` with your actual values from step 3.

#### Client Configuration

The client should already be configured to connect to `http://localhost:3001` for local development. Check `/packages/client/.env` if needed.

## Running the Application

### Development Mode (Recommended)

Run both client and server together from the root:

```bash
yarn dev
```

This will start:
- **Server** on http://localhost:3001 (using Vercel Dev)
- **Client** on http://localhost:3000

### Running Server and Client Separately

If you need to run them independently:

**Server:**
```bash
yarn workspace @slowpost/server dev
```

**Client:**
```bash
yarn workspace @slowpost/client dev
```

## First Run

On your first run, the Turso database will automatically create all necessary tables. You'll see console output confirming this.

## Development Workflow

### Authentication in Dev Mode

With `SKIP_PIN=true`, the PIN code will be logged to the console instead of being emailed. This makes local testing much easier.

1. Request a PIN for an email address
2. Check the server console output for the PIN
3. Use that PIN to sign up or log in

### Database Inspection

You can inspect your Turso database directly using the Turso CLI:

```bash
# Open a SQL shell
turso db shell slowpost-dev

# Example queries
SELECT * FROM documents WHERE collection = 'profiles';
SELECT * FROM documents WHERE collection = 'auth';
```

Or use the Turso web dashboard at https://turso.tech/

### Hot Reloading

- **Server**: Vercel Dev automatically reloads when you change API files
- **Client**: Vite provides hot module replacement for instant updates

## Troubleshooting

### "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required" Error

Make sure you've:
1. Created the `.env` file in `/packages/server/`
2. Added valid Turso credentials
3. Restarted the dev server

### Port Already in Use

If port 3001 or 3000 is already in use:

1. Stop other processes using those ports
2. Or update the `PORT` in `.env` files

### Database Connection Issues

Verify your Turso token is still valid:

```bash
turso db tokens create slowpost-dev
```

Update your `.env` file with the new token.

## API Testing

The API is available at `http://localhost:3001/api/`

Example endpoints:
- `POST http://localhost:3001/api/auth/request-pin` - Request a PIN
- `POST http://localhost:3001/api/auth/login` - Login with PIN
- `POST http://localhost:3001/api/auth/signup` - Sign up with PIN
- `GET http://localhost:3001/api/auth/me` - Get current user
- `GET http://localhost:3001/api/profiles/username` - Get a profile

## Next Steps

- Check out [deploy.md](./deploy.md) for deployment instructions
- Review [overview.md](./overview.md) for architecture details
