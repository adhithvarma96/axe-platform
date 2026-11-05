// Environment variables. Secrets live only in Vercel / .env.local, never in code.
// NEXT_PUBLIC_* values are safe to ship to the browser (the publishable key only
// opens doors that row-level security allows).

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
};

/** Server-only secrets. Importing this file from a client component is a build error. */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must never run in the browser");
  }
  return {
    supabaseSecretKey: () => required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
    anthropicApiKey: () => required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY),
  };
}
