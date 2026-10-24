import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { eq } from "drizzle-orm";

// Instância administrativa de seed com cadastro habilitado para criar os noivos
const seedAuth = betterAuth({
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
  },
});

async function runSeed() {
  console.log("🌱 Iniciando seed seguro no Neon PostgreSQL...");

  const yuriEmail = (process.env.SEED_YURI_EMAIL || "yuri@vyk.local").toLowerCase().trim();
  const yuriPass = process.env.SEED_YURI_PASSWORD || "vyk123456";

  const vithoriaEmail = (process.env.SEED_VITHORIA_EMAIL || "vithoria@vyk.local").toLowerCase().trim();
  const vithoriaPass = process.env.SEED_VITHORIA_PASSWORD || "vyk123456";

  // Limpa usuários de teste ou anteriores para garantir integridade total
  await db.delete(schema.session);
  await db.delete(schema.account);
  await db.delete(schema.user);

  // 1. Cadastra Yuri
  try {
    const yuriRes = await seedAuth.api.signUpEmail({
      body: {
        name: "Yuri",
        email: yuriEmail,
        password: yuriPass,
      },
    });
    console.log(`✅ Usuário criado no banco: Yuri (${yuriRes.user.email})`);
  } catch (err) {
    console.error("Erro ao criar Yuri:", err);
  }

  // 2. Cadastra Vithória
  try {
    const vithoriaRes = await seedAuth.api.signUpEmail({
      body: {
        name: "Vithória",
        email: vithoriaEmail,
        password: vithoriaPass,
      },
    });
    console.log(`✅ Usuária criada no banco: Vithória (${vithoriaRes.user.email})`);
  } catch (err) {
    console.error("Erro ao criar Vithória:", err);
  }

  // 3. Categorias padrão do sistema (userId = null)
  const defaultCategories = [
    { id: "cat_salario", name: "Salário", kind: "income", icon: "Briefcase", color: "#2F9E6F", systemKey: null },
    { id: "cat_extra", name: "Renda extra", kind: "income", icon: "Sparkles", color: "#4FB38A", systemKey: null },
    { id: "cat_mercado", name: "Mercado", kind: "expense", icon: "ShoppingCart", color: "#E8A33D", systemKey: null },
    { id: "cat_moradia", name: "Moradia", kind: "expense", icon: "Home", color: "#5B7593", systemKey: null },
    { id: "cat_transporte", name: "Transporte", kind: "expense", icon: "Car", color: "#6C8EBF", systemKey: null },
    { id: "cat_lazer", name: "Lazer", kind: "expense", icon: "Popcorn", color: "#C76BA8", systemKey: null },
    { id: "cat_saude", name: "Saúde", kind: "expense", icon: "HeartPulse", color: "#D9534F", systemKey: null },
    { id: "cat_assinaturas", name: "Assinaturas", kind: "expense", icon: "Repeat", color: "#8A6FD1", systemKey: null },
    { id: "cat_casamento", name: "Casamento", kind: "expense", icon: "Gem", color: "#FEDE6F", systemKey: "wedding" },
  ];

  for (const cat of defaultCategories) {
    const existing = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, cat.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.categories).values({
        id: cat.id,
        userId: null,
        name: cat.name,
        kind: cat.kind,
        icon: cat.icon,
        color: cat.color,
        systemKey: cat.systemKey,
      });
      console.log(`  + Categoria: ${cat.name}`);
    }
  }

  // 4. Configuração inicial do Casamento
  const existingWedding = await db
    .select()
    .from(schema.weddingSettings)
    .where(eq(schema.weddingSettings.id, "wedding_global"))
    .limit(1);

  if (existingWedding.length === 0) {
    await db.insert(schema.weddingSettings).values({
      id: "wedding_global",
      weddingDate: "2027-10-16",
      totalBudgetCents: 6500000,
    });
    console.log("💍 Configurações do Casamento criadas.");
  }

  // 5. Configuração inicial da Empresa VYK
  const existingCompany = await db
    .select()
    .from(schema.companySettings)
    .where(eq(schema.companySettings.id, "company_global"))
    .limit(1);

  if (existingCompany.length === 0) {
    await db.insert(schema.companySettings).values({
      id: "company_global",
      targetLaunchDate: "2028-01-10",
      targetCapitalCents: 5000000,
    });
    console.log("🚀 Configurações da Empresa VYK criadas.");
  }

  console.log("✨ Seed concluído com sucesso e credenciais validadas no Neon!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Erro durante o seed:", err);
  process.exit(1);
});
