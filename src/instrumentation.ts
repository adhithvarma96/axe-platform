// Error tracking (Sentry). Does nothing until SENTRY_DSN is set in Vercel.
import * as Sentry from "@sentry/nextjs";

export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "local",
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
