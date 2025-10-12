# Deploying Slowpost to Vercel

This guide covers deploying the Slowpost application to Vercel with Turso as the production database.

## Prerequisites

- A Vercel account (free tier works fine)
- A Turso account (free tier works fine)
- Vercel CLI installed (already in dev dependencies)
- Git repository (Vercel works best with GitHub/GitLab/Bitbucket)

## Overview

The deployment consists of two parts:
1. **Server**: Deployed as Vercel Serverless Functions (from `/packages/server`)
2. **Client**: Deployed as a static Vite application (from `/packages/client`)

Both will be deployed as separate Vercel projects.

## Step 1: Create Production Database

### Create Turso Production Database

```bash
# Create production database
turso db create slowpost-prod

# Get the database URL
turso db show slowpost-prod --url

# Create an auth token
turso db tokens create slowpost-prod
```

Save these values - you'll need them for Vercel environment variables.

### Optional: Seed Production Database

If you have test data in your dev database, you can optionally copy it:

```bash
# Dump dev database
turso db shell slowpost-dev ".dump" > data.sql

# Import to prod database
turso db shell slowpost-prod < data.sql
```

## Step 2: Deploy the Server

### 2.1 Install Vercel CLI (if not logged in)

```bash
yarn vercel login
```

### 2.2 Deploy Server to Vercel

From the repository root:

```bash
cd packages/server
yarn vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your Vercel account
- **Link to existing project?** No
- **Project name?** `slowpost-server` (or your preferred name)
- **Directory?** `.` (current directory)
- **Override settings?** No

This creates a preview deployment.

### 2.3 Configure Environment Variables

Add your Turso credentials to Vercel:

```bash
# Add production environment variables
vercel env add TURSO_DATABASE_URL production
# Paste your production database URL when prompted

vercel env add TURSO_AUTH_TOKEN production
# Paste your production auth token when prompted

vercel env add SKIP_PIN production
# Type: false

vercel env add CLIENT_URL production
# Type: https://your-client-domain.vercel.app
```

Also add these for preview deployments (development):

```bash
vercel env add TURSO_DATABASE_URL preview
# Paste your dev database URL or create a separate staging database

vercel env add TURSO_AUTH_TOKEN preview
# Paste the corresponding token

vercel env add SKIP_PIN preview
# Type: true

vercel env add CLIENT_URL preview
# Type: your preview URL or use development value
```

### 2.4 Deploy to Production

```bash
yarn deploy
```

This deploys to production with your environment variables.

Your server will be available at: `https://slowpost-server.vercel.app`

### 2.5 Note Your Server URL

Save your server URL - you'll need it for the client deployment.

## Step 3: Deploy the Client

### 3.1 Update Client Environment Variables

Update `/packages/client/.env.production` (create if it doesn't exist):

```bash
VITE_API_URL=https://slowpost-server.vercel.app
```

### 3.2 Deploy Client to Vercel

From the repository root:

```bash
cd packages/client
yarn vercel
```

Follow the prompts similar to the server deployment.

### 3.3 Deploy Client to Production

```bash
yarn vercel --prod
```

Your client will be available at: `https://slowpost-client.vercel.app`

### 3.4 Update Server CORS Configuration

Go back to your server's Vercel dashboard and update the `CLIENT_URL` environment variable to match your client's production URL:

```bash
cd ../server
vercel env rm CLIENT_URL production
vercel env add CLIENT_URL production
# Type: https://slowpost-client.vercel.app
```

Redeploy the server:

```bash
yarn deploy
```

## Step 4: Configure Custom Domains (Optional)

### 4.1 Add Domains in Vercel Dashboard

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domains:
   - `api.slowpost.app` → slowpost-server project
   - `slowpost.app` → slowpost-client project

### 4.2 Update Environment Variables

Update `CLIENT_URL` in server to use your custom domain:

```bash
vercel env rm CLIENT_URL production
vercel env add CLIENT_URL production
# Type: https://slowpost.app
```

Update client `.env.production`:

```bash
VITE_API_URL=https://api.slowpost.app
```

Redeploy both projects.

## Step 5: Verify Deployment

### Test API Endpoints

```bash
# Test server health
curl https://slowpost-server.vercel.app/api/auth/request-pin \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Test Client

Open your client URL in a browser and verify:
1. The app loads
2. You can request a PIN
3. You can sign up/login
4. All features work as expected

## Continuous Deployment

### Connect to Git

For automatic deployments on every push:

1. Go to your Vercel project settings
2. Connect your GitHub/GitLab/Bitbucket repository
3. Configure:
   - **Production Branch**: `main` or `master`
   - **Root Directory**: `packages/server` or `packages/client`

Now every push to main will trigger a production deployment!

### Preview Deployments

Every pull request automatically gets a preview deployment with a unique URL for testing.

## Monitoring and Logs

### View Logs

**Via CLI:**
```bash
vercel logs slowpost-server --follow
```

**Via Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Logs" or "Functions"

### Database Monitoring

Monitor your Turso database:

```bash
# View database stats
turso db show slowpost-prod

# Access database shell
turso db shell slowpost-prod
```

Or use the Turso dashboard at https://turso.tech/

## Updating the Application

### Deploy Updates

Simply redeploy:

```bash
# From packages/server
yarn deploy

# From packages/client
cd ../client
yarn deploy
```

Or if connected to Git, just push to your main branch.

## Troubleshooting

### "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required"

Make sure you've added the environment variables:
```bash
vercel env ls
```

If missing, add them as described in Step 2.3.

### CORS Errors

Verify the `CLIENT_URL` environment variable matches your actual client domain:
```bash
vercel env ls
```

Update if needed and redeploy.

### Database Connection Issues

Verify your Turso credentials:
```bash
turso db show slowpost-prod --url
turso db tokens create slowpost-prod
```

Update Vercel environment variables with new values if needed.

### Functions Timing Out

Vercel free tier has a 10-second function timeout. If you're hitting this:
1. Optimize database queries
2. Add database indexes
3. Consider upgrading Vercel plan

## Cost Estimation

### Turso (Free Tier)
- Up to 9 GB storage
- Up to 500 databases
- Unlimited reads
- 1 billion row writes per month

### Vercel (Hobby Plan - Free)
- Unlimited deployments
- 100 GB bandwidth per month
- 100 hours of function execution
- 6,000 build minutes

This is more than enough for small to medium applications!

## Security Best Practices

1. **Never commit** `.env` files
2. **Rotate tokens** regularly:
   ```bash
   turso db tokens create slowpost-prod
   vercel env rm TURSO_AUTH_TOKEN production
   vercel env add TURSO_AUTH_TOKEN production
   ```
3. **Enable Vercel Authentication** for sensitive preview deployments
4. **Set up email service** (Postmark) for production PIN codes
5. **Monitor logs** for suspicious activity

## Next Steps

- Set up email delivery via Postmark (update auth endpoints)
- Configure custom domains
- Set up monitoring/alerting
- Implement database backups:
  ```bash
  turso db shell slowpost-prod ".dump" > backup-$(date +%Y%m%d).sql
  ```
