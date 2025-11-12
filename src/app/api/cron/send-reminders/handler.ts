import { success, type Handler, ApiError } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const sendRemindersHandler: Handler = async (req, _ctx) => {
  // Check for authorization token
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
    const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';

    if (token !== cronSecret) {
      throw new ApiError(401, 'Unauthorized');
    }
  }

  const { db, mailer } = getHandlerDeps();

  if (!mailer) {
    return success({ message: 'Mailer not configured', sent: 0, errors: 0 });
  }

  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const currentDate = new Date();

  // Get all profiles
  const allProfiles = await db.getAllDocuments<any>('profiles');

  let sent = 0;
  let errors = 0;

  for (const { key: username, data: profile } of allProfiles) {
    try {
      // Skip if no expected send month or no email
      if (!profile.expectedSendMonth || !profile.email) {
        continue;
      }

      // Get subscriber count
      const subscribers = await db.getChildLinks('subscriptions', username);
      if (subscribers.length === 0) {
        continue; // Don't send if no subscribers
      }

      // Check if it's their expected send month
      if (profile.expectedSendMonth === currentMonth) {
        // Check if they haven't sent recently (within last 6 months)
        let shouldSendReminder = true;

        if (profile.lastSentDate) {
          const lastSentDate = new Date(profile.lastSentDate);
          const monthsSinceLastSent =
            (currentDate.getFullYear() - lastSentDate.getFullYear()) * 12 +
            (currentDate.getMonth() - lastSentDate.getMonth());

          if (monthsSinceLastSent < 6) {
            shouldSendReminder = false; // They sent recently
          }
        }

        // Check if we've already sent a reminder this month
        if (profile.lastReminderSentDate) {
          const lastReminderDate = new Date(profile.lastReminderSentDate);
          const isSameMonth =
            lastReminderDate.getFullYear() === currentDate.getFullYear() &&
            lastReminderDate.getMonth() === currentDate.getMonth();

          if (isSameMonth) {
            shouldSendReminder = false; // Already sent this month
          }
        }

        if (shouldSendReminder) {
          // Send initial reminder
          await mailer.sendAnnualLetterReminder(
            profile.email,
            profile.fullName,
            username,
            subscribers.length,
            profile.expectedSendMonth
          );

          // Mark that we sent the reminder
          await db.updateDocument('profiles', username, {
            lastReminderSentDate: currentDate.toISOString(),
          });

          sent++;
        }
      }

      // Check if it's one month after their expected send month (follow-up)
      const expectedMonthIndex = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ].indexOf(profile.expectedSendMonth);

      const currentMonthIndex = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ].indexOf(currentMonth);

      const isFollowUpMonth =
        (expectedMonthIndex + 1) % 12 === currentMonthIndex;

      if (isFollowUpMonth) {
        // Check if they still haven't sent
        let shouldSendFollowUp = true;

        if (profile.lastSentDate) {
          const lastSentDate = new Date(profile.lastSentDate);
          const monthsSinceLastSent =
            (currentDate.getFullYear() - lastSentDate.getFullYear()) * 12 +
            (currentDate.getMonth() - lastSentDate.getMonth());

          if (monthsSinceLastSent < 6) {
            shouldSendFollowUp = false; // They sent recently
          }
        }

        // Check if we've already sent a follow-up this month
        if (profile.lastFollowUpSentDate) {
          const lastFollowUpDate = new Date(profile.lastFollowUpSentDate);
          const isSameMonth =
            lastFollowUpDate.getFullYear() === currentDate.getFullYear() &&
            lastFollowUpDate.getMonth() === currentDate.getMonth();

          if (isSameMonth) {
            shouldSendFollowUp = false; // Already sent this month
          }
        }

        if (shouldSendFollowUp) {
          // Send follow-up
          await mailer.sendAnnualLetterFollowUp(
            profile.email,
            profile.fullName,
            username,
            subscribers.length,
            profile.expectedSendMonth
          );

          // Mark that we sent the follow-up
          await db.updateDocument('profiles', username, {
            lastFollowUpSentDate: currentDate.toISOString(),
          });

          sent++;
        }
      }
    } catch (error: any) {
      console.error(`Error sending reminder to ${username}:`, error);
      errors++;
    }
  }

  return success({
    message: `Sent ${sent} reminders with ${errors} errors`,
    sent,
    errors,
    currentMonth,
  });
};
