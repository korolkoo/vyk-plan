"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recurrences, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, asc, eq, like } from "drizzle-orm";
import type { Recurrence, RecurrenceFrequency, TransactionType } from "@/types/types";
import { getNthBusinessDay } from "@/utils/dates";

/**
 * Busca todas as regras de recorrência do usuário logado.
 */
export async function getRecurrencesAction(): Promise<Recurrence[]> {
  const user = await requireUser();

  const results = await db
    .select()
    .from(recurrences)
    .where(eq(recurrences.userId, user.id))
    .orderBy(asc(recurrences.dayOfMonth));

  return results.map((r) => ({
    id: r.id,
    userId: r.userId,
    type: r.type as Exclude<TransactionType, "transfer">,
    description: r.description,
    amountCents: r.amountCents,
    categoryId: r.categoryId,
    bankAccountId: r.bankAccountId,
    creditCardId: r.creditCardId,
    frequency: r.frequency as RecurrenceFrequency,
    dayOfMonth: r.dayOfMonth,
    startDate: r.startDate,
    endDate: r.endDate,
    active: r.active,
  }));
}

/**
 * Cria uma nova regra de recorrência financeira.
 */
export async function createRecurrenceAction(data: {
  type: Exclude<TransactionType, "transfer">;
  description: string;
  amountCents: number;
  categoryId?: string | null;
  bankAccountId?: string | null;
  frequency: RecurrenceFrequency;
  dayOfMonth: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
}) {
  const user = await requireUser();

  if (!data.description || !data.description.trim()) {
    throw new Error("A descrição da recorrência é obrigatória.");
  }

  if (!data.amountCents || data.amountCents <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }

  const id = "rec_" + Math.random().toString(36).substring(2, 10);

  await db.insert(recurrences).values({
    id,
    userId: user.id,
    type: data.type,
    description: data.description.trim(),
    amountCents: Math.round(data.amountCents),
    categoryId: data.categoryId || null,
    bankAccountId: data.bankAccountId || null,
    frequency: data.frequency,
    dayOfMonth: data.dayOfMonth,
    startDate: data.startDate,
    endDate: data.endDate || null,
    active: true,
  });

  revalidatePath("/financas");
  revalidatePath("/calendario");
  revalidatePath("/");

  return { success: true, id };
}

/**
 * Ativa ou desativa uma regra de recorrência.
 */
export async function toggleRecurrenceActiveAction(id: string, active: boolean) {
  const user = await requireUser();

  await db
    .update(recurrences)
    .set({ active })
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, user.id)));

  revalidatePath("/financas");
  return { success: true };
}

/**
 * Exclui uma regra de recorrência.
 */
export async function deleteRecurrenceAction(id: string) {
  const user = await requireUser();

  await db
    .delete(recurrences)
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, user.id)));

  revalidatePath("/financas");
  return { success: true };
}

/**
 * Gera transações previstas (isForecast = true, status = 'pending') para o mês
 * especificado (YYYY-MM) com base nas recorrências ativas que ainda não tenham
 * um lançamento gerado naquele mês.
 */
export async function generateForecastsAction(month: string) {
  const user = await requireUser();

  const userRecurrences = await db
    .select()
    .from(recurrences)
    .where(and(eq(recurrences.userId, user.id), eq(recurrences.active, true)));

  let generatedCount = 0;

  for (const rec of userRecurrences) {
    // 1. Verifica se já existe um lançamento com esta recurrenceId no mês
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.recurrenceId, rec.id),
          like(transactions.date, `${month}%`)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // 2. Calcula o dia exato dentro do mês (clamp para no máximo 28/30/31 ou 5º dia útil se for 0)
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, m, 0).getDate();
      
      const safeDay =
        rec.dayOfMonth === 0
          ? getNthBusinessDay(year, m, 5)
          : Math.min(Math.max(1, rec.dayOfMonth), daysInMonth);

      const targetDate = `${month}-${String(safeDay).padStart(2, "0")}`;

      // Verifica validade da data em relação a startDate e endDate
      if (rec.startDate && targetDate < rec.startDate) {
        continue;
      }
      if (rec.endDate && targetDate > rec.endDate) {
        continue;
      }

      const txId = "tx_fc_" + Math.random().toString(36).substring(2, 10);
      await db.insert(transactions).values({
        id: txId,
        userId: user.id,
        type: rec.type,
        amountCents: rec.amountCents,
        description: rec.description,
        date: targetDate,
        status: "pending",
        isForecast: true,
        categoryId: rec.categoryId,
        bankAccountId: rec.bankAccountId,
        recurrenceId: rec.id,
        source: "manual",
      });

      generatedCount++;
    }
  }

  if (generatedCount > 0) {
    revalidatePath("/financas");
    revalidatePath("/calendario");
    revalidatePath("/");
  }

  return { success: true, count: generatedCount };
}
