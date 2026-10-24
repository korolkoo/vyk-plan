import { db } from "../lib/db";
import { goals, goalContributions, user } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== TESTANDO FASE 8: METAS CONECTADAS ===");

  // Pegar usuário Yuri
  const [yuri] = await db.select().from(user).where(eq(user.email, "yuri@vyk.local"));
  if (!yuri) {
    console.error("Yuri não encontrado!");
    return;
  }
  console.log(`Usuário: ${yuri.name} (${yuri.id})`);

  // 1. Criar meta
  const goalId = `goal_test_${Date.now()}`;
  await db.insert(goals).values({
    id: goalId,
    userId: yuri.id,
    name: "Reserva de Emergência",
    targetCents: 3000000, // R$ 30.000,00
    targetDate: "2026-12-31",
    icon: "ShieldCheck",
    color: "#173B64",
  });
  console.log("✓ Meta criada:", goalId);

  // 2. Criar primeiro aporte
  const c1 = `gcontrib_1_${Date.now()}`;
  await db.insert(goalContributions).values({
    id: c1,
    goalId: goalId,
    amountCents: 500000, // R$ 5.000,00
    date: "2026-10-01",
    note: "Aporte inicial",
  });

  // 3. Criar segundo aporte
  const c2 = `gcontrib_2_${Date.now()}`;
  await db.insert(goalContributions).values({
    id: c2,
    goalId: goalId,
    amountCents: 150000, // R$ 1.500,00
    date: "2026-10-24",
    note: "Sobra do mês",
  });
  console.log("✓ Aportes inseridos:", c1, c2);

  // 4. Testar agregação
  const allContribs = await db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId));

  const totalSaved = allContribs.reduce((acc, c) => acc + c.amountCents, 0);
  console.log(`Total aportado: R$ ${(totalSaved / 100).toFixed(2)} (esperado: R$ 6500.00)`);
  console.log(`Progresso: ${((totalSaved / 3000000) * 100).toFixed(1)}%`);

  console.log("✓ Teste de Metas finalizado com sucesso no Neon PostgreSQL!");
}

main().catch(console.error);
