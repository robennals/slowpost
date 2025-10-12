import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import { createDbAdapter } from './db/types.js';
import { AuthService } from './auth/auth.js';
import { createExpressHandler } from './api/expressAdapter.js';
import { routes } from './api/routes.js';
import { createPostmarkMailerFromEnv } from './mailer/postmarkMailer.js';
import { setHandlerDeps } from './api/context.js';

config();

export const app = express();
const PORT = process.env.PORT || 3001;
const SKIP_PIN = process.env.SKIP_PIN === 'true';

const db = await createDbAdapter();
const authService = new AuthService(db, SKIP_PIN);
const mailer = createPostmarkMailerFromEnv();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

setHandlerDeps({ db, authService, mailer });

for (const route of routes) {
  const handler = createExpressHandler(route.handler, { requireAuth: route.requireAuth });
  (app as any)[route.method.toLowerCase()](route.path, handler);
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`SKIP_PIN mode: ${SKIP_PIN}`);
  });
}

export default app;
