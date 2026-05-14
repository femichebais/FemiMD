function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function publicRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required public env var: ${key}`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return publicRequired("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return publicRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get resendApiKey() {
    return required("RESEND_API_KEY");
  },
  get resendFromEmail() {
    return required("RESEND_FROM_EMAIL");
  },
};
