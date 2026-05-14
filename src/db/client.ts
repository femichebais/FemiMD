import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __femiPgClient: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __femiDrizzle: ReturnType<typeof drizzle> | undefined;
}

function getPgClient() {
  if (!global.__femiPgClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Missing DATABASE_URL");
    }
    global.__femiPgClient = postgres(url, { prepare: false });
  }
  return global.__femiPgClient;
}

function getDrizzleClient() {
  if (!global.__femiDrizzle) {
    global.__femiDrizzle = drizzle(getPgClient());
  }
  return global.__femiDrizzle;
}

// Lazy proxy: doesn't touch DATABASE_URL until a method is actually called.
// This matters at build time, when Next.js "collects page data" by loading
// route modules. We need importing this module to be side-effect-free.
export const db = new Proxy(
  {} as ReturnType<typeof drizzle>,
  {
    get(_target, prop) {
      const instance = getDrizzleClient();
      const value = instance[prop as keyof typeof instance];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  }
);
