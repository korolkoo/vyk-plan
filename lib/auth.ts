import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Cadastro público desativado: apenas os 2 usuários criados via seed podem entrar
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias de sessão persistida
    updateAge: 60 * 60 * 24, // atualiza a cada 24h
  },
});
