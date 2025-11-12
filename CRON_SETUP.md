# Setting Up the Monthly Reminder Cron Job

The reminder system sends two types of emails:
1. **Initial reminder**: Sent when it's a user's expected send month
2. **Follow-up reminder**: Sent one month after their expected send month if they haven't marked their letter as sent

## Vercel Deployment

The `vercel.json` file is already configured to run the cron job monthly (1st of each month at midnight). Vercel's hobby plan includes 2 cron jobs, which is perfect for this use case.

### Setting up Authentication

The cron endpoint is protected by Vercel's built-in `CRON_SECRET` mechanism:

1. **Add the CRON_SECRET to Vercel:**
   ```bash
   vercel env add CRON_SECRET
   ```
   When prompted, use the value from your `.env.local` file or generate a new one:
   ```bash
   openssl rand -hex 32
   ```

2. **Deploy your project:**
   ```bash
   vercel --prod
   ```

That's it! Vercel will automatically send the `CRON_SECRET` as a Bearer token in the Authorization header when calling your cron endpoint. The handler is already set up to verify this token.

## Local Testing

To test the cron endpoint locally:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/send-reminders
```

The secret is in your `.env.local` file as `CRON_SECRET`.

## How It Works

The cron job:
1. Gets all user profiles
2. For each profile:
   - Skips if no expected send month or email set
   - Skips if they have no subscribers
   - Checks if it's their expected send month
   - Checks if it's one month after their expected send month (for follow-up)
   - Only sends if they haven't marked a letter as sent in the last 6 months
   - **Duplicate prevention**: Tracks when each reminder was sent (`lastReminderSentDate` and `lastFollowUpSentDate`)
   - Won't send the same reminder type more than once in the same month
3. Returns a summary of emails sent and any errors

### Duplicate Prevention

The system prevents sending duplicate reminders by:
- Recording `lastReminderSentDate` when an initial reminder is sent
- Recording `lastFollowUpSentDate` when a follow-up reminder is sent
- Checking these dates before sending to ensure we haven't already sent that type of reminder in the current month

This means the cron job can safely run multiple times per month (or be manually triggered) without spamming users.

## Monitoring

The endpoint returns a JSON response:
```json
{
  "message": "Sent 5 reminders with 0 errors",
  "sent": 5,
  "errors": 0,
  "currentMonth": "January"
}
```

Monitor your cron service logs to ensure emails are being sent successfully.
